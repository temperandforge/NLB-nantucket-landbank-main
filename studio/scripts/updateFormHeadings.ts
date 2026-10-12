/**
 * Brings forms seeded by an earlier seedForms.ts in line with the Figma: gives the five
 * single-field sections their mono question heading and the field its small "Select one" /
 * "Select all that apply" prompt.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/updateFormHeadings.ts --with-user-token -- --dry
 *   npx sanity exec scripts/updateFormHeadings.ts --with-user-token
 *
 * What it overwrites: on `form` documents titled "Property Use Request" and "Contact Us" (drafts
 * and published), a section's `heading` and its field's `prompt`, and only where both are empty and
 * the section holds exactly the one named field. A heading or prompt an editor has already set is
 * left alone, and nothing else on the form is touched. Safe to re-run.
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

type Doc = {
  _id: string
  title: string
  sections?: {
    _key: string
    heading?: string
    fields?: {_key: string; name?: {current?: string}; prompt?: string}[]
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
    for (const section of doc.sections ?? []) {
      const only = section.fields?.length === 1 ? section.fields[0] : null
      const wanted = only?.name?.current ? plan[only.name.current] : undefined
      if (!only || !wanted || section.heading || only.prompt) continue
      set[`sections[_key=="${section._key}"].heading`] = wanted.heading
      set[`sections[_key=="${section._key}"].fields[_key=="${only._key}"].prompt`] = wanted.prompt
    }
    const count = Object.keys(set).length / 2
    if (count === 0) {
      console.log(`  = up to date: ${doc.title} (${doc._id})`)
      continue
    }
    patched += count
    if (DRY_RUN) {
      console.log(`[dry run] would update ${count} section(s) of ${doc.title} (${doc._id})`)
      continue
    }
    await client.patch(doc._id).set(set).commit()
    console.log(`  + updated ${count} section(s) of ${doc.title} (${doc._id})`)
  }
  console.log(DRY_RUN ? `Dry run: ${patched} section(s) to update.` : `Done: ${patched} section(s) updated.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
