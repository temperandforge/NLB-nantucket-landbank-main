/**
 * Seeds the two forms from the Figma designs as DRAFT `form` documents (nothing is published):
 * "Property Use Request" (Requesting Property Use Form) and "Contact Us".
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedForms.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedForms.ts --with-user-token
 *
 * What it writes: one draft `form` per form below, matched on title among published documents and
 * drafts and skipped if one exists (Sanity generates the id). It never edits an existing form and
 * never touches pages, so place the forms in Studio.
 *
 * Deliberate deviation from the Figma: the five single-field sections (Event type, Preferred
 * location, Entertainment, Transportation, Contact topic) render the field label instead of the
 * Figma's mono section heading, so validation messages and stored `answers[].label` name the
 * question. The Figma's "Select one" / "Select all that apply" is the placeholder.
 *
 * OUTSTANDING / UNCONFIRMED client content:
 * - The Event type, Preferred location, Entertainment and Transportation options are
 *   "Option 1/2/3" samples.
 * - Country and State/Province are plain text fields because the Figma shows no option lists.
 * - The Property Use Message `maxLength` of 1000 is not from the Figma.
 * - The "Caterer’s name" show-if on catering = Yes is inferred from the design, not shown in it.
 * - Contact topic is a native single select; the Figma draws a menu with check rows.
 */

import {randomUUID} from 'node:crypto'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const key = () => randomUUID().slice(0, 8)
const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

type Extra = {
  /** Overrides the slug-of-label `name` with a stable, explicit key. */
  key?: string
  placeholder?: string
  helperText?: string
  options?: string[]
  maxLength?: number
  required?: boolean
  width?: 'full' | 'half'
  showIf?: {field: string; equals: string}
}

/** A form field. `name` is the slug of the label, as Studio's Generate button would make it, unless `key` is given. */
const field = (fieldType: string, label: string, extra: Extra = {}) => {
  const {key: nameKey, ...rest} = extra
  return {
    _key: key(),
    _type: 'formField',
    fieldType,
    label,
    name: {_type: 'slug', current: nameKey ?? slugify(label)},
    required: false,
    width: 'full',
    ...rest,
  }
}
const section = (heading: string | undefined, columns: 1 | 2, fields: ReturnType<typeof field>[]) => ({
  _key: key(),
  _type: 'formSection',
  ...(heading ? {heading} : {}),
  columns,
  fields,
})

const SAMPLE = ['Option 1', 'Option 2', 'Option 3']

const FORMS = [
  {
    title: 'Property Use Request',
    submitLabel: 'Submit',
    successMessage:
      'Thank you. A member of our staff will follow up to discuss your request.',
    sections: [
      section('Requestees info', 2, [
        field('text', 'First name', {required: true, width: 'half'}),
        field('text', 'Last name', {required: true, width: 'half'}),
        field('email', 'Email', {required: true, width: 'half'}),
        field('phone', 'Phone', {required: true, width: 'half'}),
      ]),
      section('Mailing address', 2, [
        field('text', 'Address line 1', {required: true}),
        field('text', 'Address line 2', {helperText: 'Optional'}),
        field('text', 'Country', {required: true, width: 'half'}),
        field('text', 'State/Province', {required: true, width: 'half'}),
        field('text', 'City', {width: 'half'}),
        field('text', 'Zip code', {width: 'half'}),
      ]),
      section(undefined, 1, [
        field('select', 'Event type', {
          key: 'event-type',
          placeholder: 'Select one',
          options: SAMPLE,
          required: true,
        }),
      ]),
      section(undefined, 1, [
        field('select', 'Preferred location', {
          key: 'preferred-location',
          placeholder: 'Select one',
          options: SAMPLE,
          required: true,
        }),
      ]),
      section('Event details', 2, [
        field('date', 'Date', {width: 'half'}),
        field('time', 'Time', {width: 'half'}),
        field('number', 'Number of people in attendance', {
          width: 'half',
          helperText: '(Including staff)',
        }),
      ]),
      section(undefined, 2, [
        field('radioGroup', 'Will there be catering?', {
          options: ['Yes', 'No'],
          required: true,
          width: 'half',
        }),
        field('radioGroup', 'Will there be alcohol?', {
          options: ['Yes', 'No'],
          required: true,
          width: 'half',
        }),
        field('text', 'Caterer’s name', {
          required: true,
          width: 'half',
          showIf: {field: 'will-there-be-catering', equals: 'Yes'},
        }),
      ]),
      section(undefined, 1, [
        field('multiSelect', 'Entertainment', {
          key: 'entertainment',
          placeholder: 'Select all that apply',
          options: SAMPLE,
          required: true,
        }),
      ]),
      section(undefined, 1, [
        field('multiSelect', 'Transportation', {
          key: 'transportation',
          placeholder: 'Select all that apply',
          options: SAMPLE,
          required: true,
        }),
      ]),
      section('Anything else we should know? (optional)', 1, [
        field('textarea', 'Message', {maxLength: 1000}),
      ]),
    ],
  },
  {
    title: 'Contact Us',
    submitLabel: 'Submit',
    successMessage: 'Thank you. We will be in touch soon.',
    sections: [
      section(undefined, 2, [
        field('text', 'First name', {required: true, width: 'half'}),
        field('text', 'Last name', {required: true, width: 'half'}),
        field('email', 'Email', {required: true, width: 'half'}),
        field('phone', 'Phone', {required: true, width: 'half'}),
      ]),
      section(undefined, 1, [
        field('select', 'Topic', {
          key: 'topic',
          placeholder: 'Select one',
          required: true,
          options: [
            'General Inquiry',
            'Employment',
            'Map Requests',
            'Property Concerns',
            'Transfer Documents',
          ],
        }),
      ]),
      section(undefined, 1, [field('textarea', 'Message', {required: true, maxLength: 250})]),
    ],
  },
]

async function exists(title: string) {
  const ids = await client.fetch<string[]>(`*[_type == "form" && title == $title]._id`, {title})
  return ids.length > 0
}

async function main() {
  let created = 0
  for (const form of FORMS) {
    if (await exists(form.title)) {
      console.log(`  = exists: ${form.title}`)
      continue
    }
    created += 1
    if (DRY_RUN) {
      console.log(`[dry run] would create draft form: ${form.title}`)
      continue
    }
    const result = await client.create({_id: 'drafts.', _type: 'form', ...form} as never)
    console.log(`  + created draft form: ${form.title} (${result._id})`)
  }
  console.log(DRY_RUN ? `Dry run: ${created} to create.` : `Done: ${created} created.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
