# Internationalization, localization and translation

Status: draft for review. Nothing here is built. The scope questions at the end need client answers
before any of it is.

## Goal

Decide how the site would serve more than one language: how URLs carry a locale, how interface
strings are translated, how editors translate Sanity content, and what that does to the rules in
AGENTS.md. This is a recommendation with the trade-offs, not a commitment.

## Where we are

The site is single-language (English). `frontend` and `studio` have no locale, intl or translation
dependency, no `language` field on any document type, and no i18n entry in `docs/DECISIONS.md`.
Routing is `app/[...slug]` plus specific static routes (`/news/<slug>`), with page URLs derived from
the `parent` chain by the `pagePath` expression in `frontend/sanity/lib/queries.ts`.

### What the live WordPress site does today

Checked against https://www.nantucketlandbank.org/ on 2026-11-04. The live site has a language
switcher in the header (a Spanish flag and a dropdown), provided by the **GTranslate** plugin
(`wp-content/plugins/gtranslate`; markup `gtranslate_wrapper`, `gt_switcher` and Google's
`goog-te-combo`). That is Google Translate's widget wrapped by the plugin. What follows from it:

- **Translation happens in the visitor's browser.** The server sends English; the widget translates
  after load. A text-only fetch sees only English, which is how an earlier check of this site missed
  the switcher entirely.
- **Nothing Spanish is indexable.** There are no `hreflang` tags and the Yoast sitemap lists no
  per-language URLs.
- **No one reviews the output.** It is raw machine translation. Property names, place names and
  legal wording can come out wrong, and editors cannot correct them.
- **At least 50 languages are enabled** (reported by the client). Whether any beyond Spanish are
  actually used is unknown, and so is whether the list includes right-to-left languages.
- **Not confirmed:** whether the plugin is on a free tier (client-side only) or a paid tier that
  adds `/es/` paths. `/es/` on the live site served English content, which fits neither cleanly. The
  plugin settings in wp-admin would settle it.
- **The widget appears to translate on load from the browser's language.** My browser's page came
  back as `<html lang="es">` with a Spanish title without any click. Unconfirmed.

The client chose to offer Spanish, so there is real demand. The `language:es` flag in the CSV export
spec ([wordpress-content-csv-export](2026-11-03-wordpress-content-csv-export-design.md)) is only a
heuristic for pages whose content is in Spanish; it is not evidence that such pages exist.

**Launch gap.** The Next.js site has no switcher. Launching without a replacement removes Spanish
access that visitors have today, in 50+ languages. See "Two tiers" below.

## Terms

- **Internationalization (i18n):** making the code able to serve any locale: routing, string lookup,
  formatting.
- **Localization (l10n):** the per-locale result: translated content plus formatting for dates,
  numbers and plurals.
- **Locale:** language, optionally with region (`es`, `es-US`). Use language-only codes unless a
  regional difference is real.

## Three separate problems

### 1. Locale routing

Next.js 16's App Router has no built-in i18n routing. The bundled guide
(`node_modules/next/dist/docs/01-app/02-guides/internationalization.md`) describes the manual
pattern: nest everything under `app/[lang]/`, detect the locale from `Accept-Language` in `proxy.ts`,
redirect to a prefixed path.

**Recommendation: sub-path routing, `/es/...`, with English unprefixed.** Subdomains and separate
domains add DNS, certificate and `siteUrl` complexity for no gain here. Unprefixed English keeps
every existing URL, link and redirect valid, so nothing already indexed moves.

Detection: do **not** auto-redirect on `Accept-Language`. A redirect on a cached, statically rendered
page is fragile, makes `/` unlinkable for search engines, and surprises visitors. Offer a language
switcher and remember the choice in a cookie; at most, show a dismissible banner suggesting the
visitor's language.

### 2. Interface strings

Navigation chrome, form labels, buttons, error messages, `aria-label`s, "Share", "Read more", date
formats. Options:

| Option | Notes |
|---|---|
| **next-intl** | The common App Router choice. Server and client components, ICU plurals and dates, typed message keys, optional localized pathnames. |
| Hand-rolled dictionaries | The Next.js guide's pattern. No dependency; plurals and formatting are ours to maintain. Fine below ~50 strings. |
| Paraglide (inlang) | Compiled, tree-shakeable. Lighter, less established with Next. |
| react-i18next | Built for the Pages Router; poor fit for server components. |

**Recommendation: next-intl**, but only if there is more than a handful of strings. Note that most
visitor-facing text on this site is editor-authored content in Sanity, not code, so the string
catalog is small. Before adopting a library, inventory the hardcoded strings in
`frontend/components` and `frontend/app`; if the count is small, a typed dictionary is enough and
can be swapped for next-intl later without touching Sanity.

Strings that editors should control (a form's labels, the footer's text) already live in Sanity and
are covered by section 3, not the catalog.

### 3. Translating Sanity content

Two standard patterns:

- **Document-level.** Each translation is its own document with a `language` field, tied together by
  a `translation.metadata` document (`@sanity/document-internationalization`). Slug, SEO and publish
  state differ per language. Editors switch language in the Studio.
- **Field-level.** Each translatable field holds one value per language
  (`sanity-plugin-internationalized-array`). One document, one publish state.

**Recommendation: document-level for content, field-level only for singletons and taxonomy titles.**

| Type | Approach | Why |
|---|---|---|
| `page`, `article`, `event`, `project`, `property`, `job`, `record` | Document-level | Long Portable Text bodies, per-language slugs and SEO, a translation may lag or never exist. |
| `faq`, `commissioner`, `staffMember` | Decide per type | A person's name does not translate; their bio might. Likely document-level for `faq`, untranslated for people. |
| `settings`, footer, `projectSettings` | Field-level where text exists | Singletons; one document is easier than a language switcher per singleton. |
| `propertyType`, `resource`, `projectType` | Field-level title, language-neutral slug | The slug is the stable key and filters use it, so it must not vary by language. |
| `menu` | Document-level, one menu per language | Menus reference pages; a Spanish menu must reference Spanish pages. |
| `redirect`, `formSubmission` | Untranslated | Operational data. |
| `projectSettings.boundaryData` | Untranslated | Geometry is language-neutral. |

Untranslated content falls back to English with a visible indicator, never a 404, unless the page is
intentionally English-only (then the switcher omits that language for it).

#### Full mirror

If every tier 1 language mirrors the whole site, the work and the maintenance both scale with
languages times documents:

- **Cost.** Each added language is a translation of every page, article, property, event, project,
  FAQ and menu, and then of every edit after. Two languages double the editorial load; keep tier 1
  small.
- **Coverage must be visible.** The Studio needs a per-language view of what is untranslated or
  stale (the source changed after the translation), or a mirror quietly decays into a mix of
  languages. The English fallback with an indicator is the safety net, not the plan.
- **Machine drafts carry the load.** At this scale, a machine draft plus editor review (Sanity AI
  Assist or the Agent Actions translate API) is the only realistic workflow. Hand translation of the
  whole site is not.
- **New content is not finished until it is mirrored.** Publishing in English alone leaves a gap in
  every tier 1 language, so the editorial process needs a step for it.
- **Migration.** The existing WordPress content (about 186 URLs) would need translating per language
  before launch, or launch with English fallback and fill in afterwards.

Machine translation is an option for first drafts: Sanity's AI Assist translation actions and the
Agent Actions translate API both work inside the Studio. Drafts need editor review before publish; a
property or notice mistranslated is worse than one in English only.

## What this changes in existing rules

Each item below is a decision this spec makes, to be recorded in `docs/DECISIONS.md` if accepted.

**Page URLs.** `page.slug` stays a single segment and the path stays derived from the `parent` chain,
now within one language: a Spanish page's `parent` must be a Spanish page. The full path is
`/<locale>` + the `pagePath` result for non-default locales. The two copies of the depth rule
(`MAX_PAGE_DEPTH` in `studio/src/lib/pageHierarchy.ts`, `pagePath` in `queries.ts`) are unaffected,
but the locale prefix is added in one place only, a shared constant, so it does not become a third
copy. "A page URL is never derivable from its slug alone" gets stronger: it is also not derivable
without the document's language.

**Slug uniqueness.** Per-sibling uniqueness becomes per-sibling *within a language*. The Studio's
`isUnique` check needs the `language` field in its filter.

**Catch-all.** `app/[...slug]` moves under `app/[lang]/` (with `lang` optional for the default
locale, via a rewrite in `proxy.ts` or a route group). More specific static routes keep winning.
Unmatched paths still call `notFound()`. An unknown first segment is treated as part of the page
path, not a locale, so a typo cannot render the default locale's home page.

**SEO and structured data.** `buildMetadata` adds `alternates.languages` (hreflang) from the
document's translation group, including `x-default`. Canonical is still derived from the page's own
address, per language. The sitemap lists every language version with its alternates. JSON-LD builders
gain `inLanguage`. `html lang` is set from the locale in the root layout. `settings.siteUrl` stays
the single origin. All of this is derived at render, never authored.

**Redirects.** The Sanity Function that creates redirects on rename or move must scope to a language
so a Spanish rename does not redirect the English URL, and redirects need a locale-aware source path.

**Presentation.** `mainDocuments` routes and `defineLocations` need the locale prefix in both
directions, per the existing "both directions wired" rule.

**Menus and footer.** Resolved by locale at render. A region that has no menu in the current locale
falls back to the default locale's menu rather than throwing, as site-wide regions must degrade.

**Taxonomy filters.** URL filters keep using the slug, so `?type=conservation` works in every
language. Only the label changes.

**Formatting.** Dates, numbers and plurals go through `Intl` with the locale. No hardcoded
`en-US` formats.

**Search.** Search results must be filtered to the current language, or the index split by language.
The search implementation needs checking before this is scoped.

**Typegen and queries.** `language` becomes part of most queries' filters. Derive types from the
generated query results as now. The list of supported languages lives in one place, shared by the
Studio and frontend config, and is not restated elsewhere. Unlike a taxonomy, adding a language
changes routing, so it needs a deploy (open decision 5).

## Migration

1. Add the `language` field and install the plugin, defaulting new documents to English.
2. A script, `studio/scripts/stampLanguage.ts`, sets `language: 'en'` on existing translatable
   documents. Idempotent, matches on `_id`, with `--dry`, run through
   `sanity exec ... --with-user-token`. It overwrites nothing but the missing field.
3. Seed the English menu and footer references so each has a language.
4. Create translations from the Studio, or import them from the WordPress export.

The WordPress export already flags Spanish pages. If those are kept, they import as `language: 'es'`
documents linked to their English counterpart, which the CSV would need a `translation_of` column
for. That is a change to the export spec, not made here.

## Verification when built

A new `studio/scripts/verifyLocalization.ts`, importing the real definitions rather than restating
them:

- every translatable document has a `language`;
- every non-default page's `parent` has the same language;
- no two siblings share a slug within a language;
- every translation group has at most one document per language;
- the generated `/es/...` path of each page resolves to exactly that document.

Plus the existing `verifyPageRouting.ts`, `checkStructuredData.ts` and `verifyStructuredData.ts`,
extended to check hreflang reciprocity (if A lists B as an alternate, B lists A).

## Delivering translated documents

A `record` is one downloadable file under a category, with no page of its own, so the document-level
machinery above is more than it needs. Options:

| Option | How it works | Fit |
|---|---|---|
| A. One record per language | Each translation is its own `record` with a `language` field, linked to the English one. | Consistent with the rest of this spec, but duplicates the date and category and the pairs must be kept in sync. |
| **B. One record, several files** | Add `translations: [{language, file, title?}]` to `record`. The row reads "Minutes, 12 March: English, Español". | **Recommended.** One date, one category, one row. A translation sits beside its English original. No new URLs. |
| C. Auto-translate the PDF | A document-translation API produces a draft file. | A first draft only. Layout often breaks and accuracy is not guaranteed; a person must review it before it is attached. |

Option B leaves the archive's filters and ordering alone, and the existing "title, else date, else
file name" label rule needs no change.

Rules, whichever option is chosen:

- **The widget does not translate linked files.** For tier 2 languages a vital document stays
  English-only. Show a short **language-assistance notice** ("help with this document in your
  language is available on request"), with a contact who can act on it, in the top few languages
  (open decision 9), next to the document list.
- **Tier 1 languages get the real file**, labelled with the language's own name ("Español") and a
  `lang` attribute on the link so screen readers pronounce it correctly.
- **Fallback.** A record with no translation shows only English: no empty slot, no broken link.
  Anything rendered site-wide degrades and never throws.
- **Forms and notices are structured content, not files.** `form` and notices use the document-level
  translation described above. Only file-based records use option B.
- **Accessibility.** Translated PDFs should be tagged and carry a language property. If the ADA
  Title II web rule covers the Land Bank, documents are likely in scope; how it treats PDFs is
  unverified (see "Legal context").
- **Search.** Records are searchable only if they have a destination. Whether a translated file
  should be findable by terms in its own language depends on how search handles languages, which has
  not been checked.

## Alternatives rejected

- **Auto-redirect on `Accept-Language`.** Fragile with static rendering and bad for crawlers.
- **A translation proxy or overlay (Google Translate widget, Weglot) as the long-term answer.**
  This is what the live site already does through GTranslate. Content is not indexable per language,
  editors cannot correct it, and it ignores the Sanity model. It is rejected for the languages that
  matter most (tier 1) and kept for the long tail (tier 2).
- **Field-level for everything.** One document per page is tidy, but long Portable Text with per-
  language slugs and SEO becomes unmanageable, and a half-translated page publishes as a unit.
- **Locale in a query parameter (`?lang=es`).** Not crawlable as distinct pages.

## Legal context

Researched 2026-11-04. This is not legal advice; the client's counsel should confirm it. Nothing
found requires the Land Bank to translate its website, but the picture is incomplete.

- **The Land Bank is a public instrumentality, not an ordinary nonprofit.** It was created by
  Chapter 669 of the Acts of 1983 and a Massachusetts court has described it as a "body politic and
  corporate" and a public instrumentality. Public-entity rules matter more than nonprofit rules.
- **Title VI of the Civil Rights Act** applies to any organization receiving federal financial
  assistance, and if any part receives it the whole organization is covered. The standard is
  "reasonable steps" to give limited-English speakers meaningful access, judged by a four-factor
  test. Federal agency guidance says an entire website generally need not be translated, only vital
  documents, and a translated document should be posted beside its English original. That is
  guidance, not a binding rule. **Unknown:** whether the Land Bank receives any federal money.
- **Massachusetts.** Executive Order 526 and a 2023 executive order require language access plans of
  executive-branch agencies; whether the Land Bank counts as one is unconfirmed (probably not). The
  Language Access and Inclusion Act, filed in several sessions, would bar state agencies from relying
  solely on machine translation for websites and require a disclaimer where they use it. It is
  unconfirmed whether any version has passed, and it would cover state agencies.
- **ADA Title II web rule (unverified, from memory).** A 2024 DOJ rule requires state and local
  governments to meet WCAG 2.1 AA, with compliance dates in 2026 or 2027 by population served. If it
  covers the Land Bank, it applies to the new site regardless of translation. Verify the current
  deadlines.

What follows: the legal risk concentrates in **vital documents** (notices, meeting agendas, forms,
public-comment steps), not in a full mirror of the site. Machine translation alone is the weakest
position for those, and a visible disclaimer is a cheap protection. This is why tier 1 starts with
vital documents.

## Two tiers: real translations and a machine-translated long tail

With 50+ languages enabled today, translating the site properly into all of them is not realistic,
and the rest of this spec (document-level translation, per-language slugs, hreflang) is built for a
small number of languages. The recommended shape is two tiers:

1. **Tier 1: a few real languages**, chosen from evidence of use (open decision 8). Spanish first. These
   get Sanity translations, `/es/` URLs, `hreflang`, and editor review, as described above.
   Vital documents (`record`, `form`, notices and agendas) are translated first, ahead of the rest of
   the mirror (see "Legal context").
2. **Tier 2: everything else stays machine-translated in the browser**, through the same Google
   Translate widget, behind the same switcher. It is not a stopgap to remove; it is the long-tail
   answer, kept because no one will hand-translate the rest.

Rules for tier 2:

- **A visible disclaimer** states that the page was machine translated and accuracy cannot be
  ensured, and points to the English original. It is shown whenever the widget has translated a page.
- It must follow the performance rules: load after first interaction or idle, never in the first
  paint, and never block rendering.
- It has the limits listed under "What the live WordPress site does today": nothing is indexable, no
  `hreflang`, no editor correction. That is acceptable for the long tail and not for tier 1.
- **It must not re-translate tier 1 content.** A page that exists in a real translation is excluded
  from the widget (the `notranslate` hint on the page, and the switcher showing the real `/es/` link
  for that language, not the widget's option).
- **Real languages appear in the switcher as links; the rest appear through the widget.** Both are
  one control to the visitor.
- **Right-to-left** needs no layout work for tier 2, because the widget flips direction itself. RTL
  stays out of scope for tier 1 unless an RTL language is chosen.
- Content sent to Google for translation includes everything on the page. Nothing here is private,
  but the privacy policy should name the widget.

Whether to ship tier 2 at launch is open decision 7.

## Open decisions

1. **Which languages get real translations (tier 1)?** The live switcher enables 50+ through machine
   translation; Spanish is the only one we know to be wanted. Tier 1 should stay small, so that every
   language in it can be reviewed. RTL adds layout work throughout tier 1 and is out of scope unless
   an RTL language is chosen.
2. **Scope.** The client reports that each language translates the full site, which is what the live
   widget does today. This spec treats a full mirror as the scope for every tier 1 language until told
   otherwise: every translatable type in the table above gets the `language` field, including
   properties and articles. Confirm that a tier 1 language is meant to be the whole site, not a subset
   of key pages; it decides the cost in "Full mirror" below.
3. **Who translates.** Today nobody reviews the output (raw browser machine translation). Editors by
   hand, machine draft plus review, or an agency? This decides whether to integrate a translation
   service.
4. **Where `/es` content lives for properties.** Property names and addresses are proper nouns; a
   translated property page may only need the description. Whether `property` is document-level or
   stays English with translated labels is open.
5. **Adding a language later.** It needs a routing change and a deploy, even if the content does not.
   Accept that, or design for editor-added languages (more complex, probably not worth it).
6. **Legal.** Ask Land Bank or town counsel: does Title VI apply (is any federal money received), is
   the Land Bank covered by the state language access orders, and does the ADA Title II web rule
   cover it and by when? Until answered, this is an open question, not a requirement. Whether
   notices, agendas and forms must be offered in Spanish is also for counsel. Either way, translate
   those first (see "Legal context").
7. **Ship the machine-translation widget (tier 2) at launch?** Keeping parity with the live site
   keeps every enabled language reachable. Launching English-only drops all of them. Recommendation:
   ship it, deferred, with a language list trimmed to what is used (decision 8).
8. **Which of the 50+ languages are used?** Nobody knows. Evidence to look for: GTranslate's own
   statistics if the paid tier exposes them, Google Analytics language and `#googtrans` hash
   reports, and Search Console. This decides tier 1 and lets tier 2 offer a shorter, more usable list
   than 50+ flags.
9. **Which languages get the language-assistance notice?** The notice (see "Delivering translated
   documents") offers help on request for vital documents that exist only in English. It can cover
   more languages than tier 1, since it is a sentence, not a mirror. Pick the top few from the usage
   evidence in decision 8, and name a contact who can act on a request.

## Deferred

Nothing is deferred yet, because nothing is built. When a slice ships, anything cut from it (search
per language, translated forms, RTL) gets a GitHub issue and is linked here, per the deferred-work
rule.
