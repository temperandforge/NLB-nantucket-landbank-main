/**
 * Brings forms seeded by an earlier seedForms.ts in line with the Figma: gives the five
 * single-field sections their mono question heading and the field its small "Select one" /
 * "Select all that apply" prompt, and fills the example placeholders on the email, phone and address
 * fields.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/updateFormHeadings.ts --with-user-token -- --dry
 *   npx sanity exec scripts/updateFormHeadings.ts --with-user-token
 *
 * What it overwrites: on `form` documents titled "Property Use Request" and "Contact Us" (drafts
 * and published), a section's `heading` and its field's `prompt`, and only where both are empty and
 * the section holds exactly the one named field. A heading or prompt an editor has already set is
 * left alone, as is any placeholder already set. Nothing else on the form is touched. Safe to re-run.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})
const DRY_RUN = process.argv.includes('--dry')

/** form title -> field name -> the section heading and prompt it should have. */
const PLAN: Record<string, Record<string, {heading: string; prompt: string}>> = {
  'Property Use Request': {
    'event-type': {heading: 'Event type', prompt: 'Select one'},
    'preferred-location': {heading: 'Preferred location', prompt: 'Select one'},
    entertainment: {heading: 'Entertainment', prompt: 'Select all that apply'},
    transportation: {heading: 'Transportation', prompt: 'Select all that apply'},
  },
  'Contact Us': {
    topic: {heading: 'Choose a topic', prompt: 'Select one'},
  },
}

/** field name -> placeholder, for any field of these forms that has none. */
const PLACEHOLDERS: Record<string, string> = {
  email: 'janesmith92@gmail.com',
  phone: '(123) 456-7890',
  'address-line-1': 'Address line 1',
  'address-line-2': 'Address line 2 (optional)',
}

type Doc = {
  _id: string
  title: string
  sections?: {
    _key: string
    heading?: string
    fields?: {_key: string; name?: {current?: string}; prompt?: string; placeholder?: string}[]
  }[]
}

async function main() {
  const docs = await client.fetch<Doc[]>(`*[_type == "form" && title in $titles]`, {
    titles: Object.keys(PLAN),
  })
  let patched = 0
  for (const doc of docs) {
    const plan = PLAN[doc.title]
    const set: Record<string, string> = {}
    let count = 0
    for (const section of doc.sections ?? []) {
      for (const f of section.fields ?? []) {
        const wanted = f.name?.current ? PLACEHOLDERS[f.name.current] : undefined
        if (!wanted || f.placeholder) continue
        set[`sections[_key=="${section._key}"].fields[_key=="${f._key}"].placeholder`] = wanted
        count += 1
      }
      const only = section.fields?.length === 1 ? section.fields[0] : null
      const wanted = only?.name?.current ? plan[only.name.current] : undefined
      if (!only || !wanted || section.heading || only.prompt) continue
      set[`sections[_key=="${section._key}"].heading`] = wanted.heading
      set[`sections[_key=="${section._key}"].fields[_key=="${only._key}"].prompt`] = wanted.prompt
      count += 2
    }
    if (count === 0) {
      console.log(`  = up to date: ${doc.title} (${doc._id})`)
      continue
    }
    patched += count
    if (DRY_RUN) {
      console.log(`[dry run] would make ${count} change(s) to ${doc.title} (${doc._id})`)
      continue
    }
    await client.patch(doc._id).set(set).commit()
    console.log(`  + made ${count} change(s) to ${doc.title} (${doc._id})`)
  }
  console.log(DRY_RUN ? `Dry run: ${patched} change(s) to make.` : `Done: ${patched} change(s) made.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
