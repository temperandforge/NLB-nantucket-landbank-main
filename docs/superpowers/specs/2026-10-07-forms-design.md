# Forms: `form` document, embedded forms and the Contact Form block

Status: draft for review. Date: 2026-10-07.

## Goal

Editors build forms in Studio and place them on pages. A visitor can complete and submit a form
with a mouse, touch or keyboard alone, and the submission is stored in Sanity.

Two placements are in scope:

- **Basic Left Right Text**: a form placed anywhere inside the right column's rich text
  (Figma `1910-12756`, the Requesting Property Use Form).
- **Contact Form block**: left column with heading and contact details, right column with a form
  (Figma `1910-11078`). This updates the existing `contactForm` block, which is currently a
  placeholder.

Styling source of truth is the design system's Input (Figma file `gvzEWIlCG5ER28tsFD6YlI`, node
`499-209`). Where the page designs differ from it, the design system wins and the discrepancy is
flagged in the PR.

## Decisions taken in brainstorming

| Question | Decision |
| --- | --- |
| On submit | Store a `formSubmission` in Sanity. Email is deferred. |
| Form model | Sections of typed fields. |
| Conditional fields | Yes, a simple show-if rule. |
| Spam protection | Honeypot, rate limit and Cloudflare Turnstile, layered. |
| Contact block | Update the existing `contactForm`. |
| Left Right placement | `formEmbed` inside the right column's rich text, not a replacement for it. |
| Sanity write token | A server-only token is acceptable. Auto-delete window is deferred. |

## Content model (Studio)

### `form` document

Not a singleton, so Sanity generates its `_id` (project rule).

- `title` (string, required): internal name shown in pickers.
- `submitLabel` (string, default "Submit").
- `successMessage` (text, required): shown after a successful submit.
- `sections[]` (required, at least one):
  - `heading` (string, optional): rendered as the mono sub-heading in the Figma ("Mailing address").
  - `columns` (1 or 2): the grid for its fields. Defaults to 1.
  - `fields[]`: one of the field types below.

### Field types

Each is an array member object with a shared base:

- `label` (string, required)
- `name` (slug-like key, auto-derived from the label, unique within the form, required): the stable
  key stored on submissions. Renaming a label does not change it; changing a `name` orphans old
  submissions' keys, so Studio warns on edit.
- `helperText` (string)
- `required` (boolean)
- `width` ("full" or "half"): half fills one cell of a 2-column section. Ignored in a 1-column
  section.
- `showIf` (optional): `{field: <name of an earlier choice field>, equals: <option value>}`.

Types and their extras:

| Type | Extras |
| --- | --- |
| `text`, `email`, `phone`, `number` | `placeholder` |
| `textarea` | `placeholder`, `maxLength` (shows the "0/250" counter) |
| `select`, `multiSelect` | `placeholder`, `options[]` (`label`, `value`) |
| `date`, `time` | none (native pickers) |
| `checkboxGroup`, `radioGroup` | `options[]` (`label`, `value`) |

Option `value` defaults to a slug of the label. Choice categories are authored per field, not
shared documents: they are form content, not site taxonomy.

### Validation (Studio)

- `name` unique per form.
- `showIf.field` must name a field that appears earlier in the form and is a `select`, `radioGroup`
  or `checkboxGroup`; `showIf.equals` must be one of its option values.
- A required field with a `showIf` is required only while it is shown; hidden fields are never
  validated, so a hidden required field cannot block submission.

### `formSubmission` document

Created only by the route handler. Read-only in Studio.

- `form` (reference), `formTitle` (string snapshot), `submittedAt` (datetime), `status`
  ("new" or "reviewed", the only editable field).
- `answers[]`: `{name, label, value}`, a snapshot of what was asked and answered, so it stays
  readable if the form is later edited. `value` is a string; multi-selects and checkbox groups are
  stored as the selected labels joined with ", ".
- Holds personal data, so Studio structure lists it under its own clearly named entry,
  separate from content.

### Blocks

- **`contactForm`**: keep `heading`; add `details` (rich text, text-only, for phone, fax and
  email) and `form` (reference, optional). Existing heading-only blocks continue to render.
  Because `form` is optional, a block with no form renders the left column only, with no
  placeholder text.
- **`basicLeftRightText`**: `rightContent` switches to a new rich-text type that is
  `blockContent` plus a `formEmbed` member (a reference to a `form`). Other blocks keep the plain
  `blockContent`, so editors don't see a Form option elsewhere. If the Studio rendering of an
  embedded form is just a title, a preview showing the form title is enough.

## Frontend

### Data

- GROQ projects the form with its sections, fields and options. Types are derived from the
  generated query result types (no restating field-type lists).
- A `formEmbed` reference that is unpublished or missing renders nothing and does not throw
  (site-wide rendering rule).

### Components

Under `frontend/components/ui/form/`:

- `Field` (label, helper, error wiring), `TextInput`, `Textarea`, `Select`, `MultiSelect`,
  `DateInput`, `TimeInput`, `CheckboxGroup`, `RadioGroup`.
- `FormRenderer` (client component): owns values and errors, evaluates `showIf`, validates, submits.
- `FormEmbed`: server component that renders `FormRenderer` for a portable-text `formEmbed`.
  `ContactForm` and `FormEmbed` share `FormRenderer`.

Icons (chevron, calendar, clock, square, square-check, arrow) are inline SVG components using
`currentColor`, committed to the repo, never hotlinked from Figma.

### Tokens

Added per feature and named after the Figma variables, only the ones used: `input`, `on-input`,
`on-input-placeholder`, `on-background-subtle`, `border-light`, `error`, `surface-light`,
`on-surface-light`. Where a Figma value nearly matches an existing token the existing one is used
and the discrepancy flagged.

### Visual states (from the design system)

- **Text-like controls**: inactive (filled `input` background, no border), hover (`background`
  colour), focus (`background` colour, `border-light` border), filled (`input` background, `on-input`
  text), error (`error` border and error-coloured label and helper). Fixed height 48px; textarea
  173px with 12px padding.
- **Select and multi-select** use the same shell with a chevron. Single select uses a native
  `<select>` styled to match. The date and time controls show a calendar or clock icon over a native
  input.
- **Menu** (multi-select list and any custom dropdown): `surface-light` background, 4px radius,
  the Figma shadow, option rows with a square or square-check icon (matches the topic dropdown
  in `1910-11078`).
- **Checkbox and radio** rows follow the Yes/No pattern in `1910-12756`, with a visible focus ring.
- The form's section headings use the mono body style; the submit button uses the existing
  secondary (gold) button style with the arrow icon.

### Submit flow

1. `FormRenderer` validates on blur (after first touch) and on submit. A failed submit moves focus to
   the first invalid field and shows a summary `role="alert"`.
2. POST `/api/forms/[formId]` with `{values, turnstileToken, honeypot}`.
3. The route handler fetches the form from Sanity (never trusting the client's copy), evaluates
   `showIf`, re-validates every shown field (required, type, option membership, `maxLength`), drops
   hidden fields' values, then creates a `formSubmission` with the server-only token.
4. Success replaces the form with `successMessage` (focus moved to it, announced via `role="status"`).
   Errors return field-level messages mapped by `name`, or a generic failure message with the
   form values preserved.

### Spam protection

- **Honeypot**: a visually hidden text field, `tabindex="-1"` and `aria-hidden`, with
  `autocomplete="off"`. A filled value is accepted silently (200) and discarded, so bots get no signal.
- **Rate limit**: per-IP limit in the route handler. The store must work on the host (decided in the
  plan; an in-memory limit is not reliable on serverless).
- **Turnstile**: shown when the site key is configured; the server verifies the token when the secret
  is configured. With no keys (local dev) it is skipped and the form works. Turnstile's widget is
  rendered in a way that keeps tab order sensible and has an accessible label.

### Environment

- `SANITY_WRITE_TOKEN` (server only, a role limited to creating `formSubmission` documents where
  Sanity permits).
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.

## Keyboard and screen-reader accessibility

- Use native elements wherever they exist: `<input>`, `<textarea>`, `<select>`, checkbox, radio and
  `<fieldset>`/`<legend>` for groups. Tab order is DOM order.
- **Multi-select (custom listbox)**: the trigger is a button with `aria-haspopup="listbox"` and
  `aria-expanded`.
  - Enter, Space or ArrowDown opens it; focus moves into the list.
  - Up/Down move between options, Home/End jump to the first and last, and typing a character jumps
    to a match.
  - Space toggles the option (`aria-multiselectable`, `aria-selected`), and the active option uses
    `aria-activedescendant`.
  - Escape closes it and returns focus to the trigger; Tab closes it and continues to the next field.
- A visible focus indicator on every control, including checkboxes and radios whose native input is
  visually replaced. Focus styling meets 3:1 contrast against the adjacent colours.
- Every control has a programmatic label; required fields use `aria-required`; helper and error text
  are linked with `aria-describedby`; invalid fields carry `aria-invalid`.
- Fields hidden by `showIf` are removed from the DOM (not just visually hidden), so they are out of
  the tab order and out of validation. When a field appears or disappears, focus is not moved.
- Touch and click targets are at least 44px, including checkbox and radio rows.
- Respect `prefers-reduced-motion` for any transition.

## Verification

- `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`; `npx tsc --noEmit`
  in `studio`; commit regenerated types and `sanity.schema.json`.
- A script `studio/scripts/verifyForms.ts` that imports the real schema definitions and checks the
  data-dependent contracts: every `showIf` target exists earlier and has the matching option, `name`s
  are unique per form, and every `formEmbed` and `contactForm.form` reference resolves to a published
  form.
- A seed script for the two Figma forms (Property Use, Contact), idempotent, matched on `title`,
  with a `--dry` mode.
- Browser check of both layouts at desktop and mobile widths, including a keyboard-only pass through
  each form (tab, arrows, Escape, Enter) and a failed-submit pass.
- Verify with a token-less dev server that the form renders and validates; actual submission is
  verified separately against a dataset with the write token, since a missing token must not be
  mistaken for a broken form.

## Deferred work (a GitHub issue each, linked here before merge)

- Email notification of submissions, including provider choice and per-form recipients.
- Submission retention: an auto-delete window for stored personal data.
- File upload fields.
- Splitting `formSubmission` access by Studio role.

## Open points for the plan

- Where the rate-limit counter lives, given the deployment target.
- Whether `SANITY_WRITE_TOKEN` can be scoped to a create-only role on this plan.
- A native `<select>` limits styling of the open list; the spec accepts this for single selects and
  uses the custom listbox only for multi-select.
