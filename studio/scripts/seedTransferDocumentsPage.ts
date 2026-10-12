/**
 * Fills the page builder of the "Transfer Documents" page to match the Figma design
 * (Nantucket - Website, node 1910:14519).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedTransferDocumentsPage.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedTransferDocumentsPage.ts --with-user-token
 *
 * What it writes: sets `pageBuilder` on the page with slug "transfer-documents" (draft if one
 * exists, otherwise the published document). It refuses to run if that page already has blocks,
 * so it never discards Studio edits. Idempotent for that reason.
 *
 * Deferred: the hero uses Hero - Tertiary because the design's header photo was not uploaded
 * (Hero - Image requires one); the form download rows link to `#` until the PDFs are supplied.
 */

import {randomUUID} from 'node:crypto'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const SLUG = 'transfer-documents'

const key = () => randomUUID().slice(0, 8)

const text = (value: string, style = 'normal') => ({
  _type: 'block',
  _key: key(),
  style,
  markDefs: [],
  children: [{_type: 'span', _key: key(), text: value, marks: []}],
})

const step = (title: string, body: string) => ({
  _type: 'block',
  _key: key(),
  style: 'normal',
  markDefs: [],
  children: [
    {_type: 'span', _key: key(), text: title, marks: ['strong']},
    {_type: 'span', _key: key(), text: `\n${body}`, marks: []},
  ],
})

const downloads = (labels: string[]) => ({
  _type: 'anchorLinks',
  _key: key(),
  links: labels.map((label) => ({
    _type: 'anchorLink',
    _key: key(),
    label,
    icon: 'download',
    link: {_type: 'link', linkType: 'href', href: '#'},
  })),
})

const pageBuilder = [
  {
    _type: 'heroTertiary',
    _key: key(),
    eyebrow: 'Transfer Documents',
    heading: 'Getting Started with Property Transfers',
    headingLevel: 'h1',
  },
  {
    _type: 'jumpNavContent',
    _key: key(),
    headingLevel: 'h1',
    content: [
      text('How it Works', 'h2'),
      text(
        "Everything you need to complete your Nantucket property transfer is on our site. Download the necessary forms, review our step-by-step transfer overview, and find answers to common questions in our FAQ section — all in one place. Whether you're navigating this for the first time or just need a quick refresher, we've made it as simple as possible to get done.",
      ),
      text('Step by Step', 'h2'),
      step(
        'Step 1: Download Your Forms',
        'Start by downloading Form 1, which is required for all property transfers. If your transaction involves an entity — such as a trust, corporation, partnership, LLP, or LLC — download Form 2 as well and complete one for each entity involved. Open all forms in Adobe Reader 9 or higher.',
      ),
      step(
        'Step 2: Complete Your Forms',
        'Fill out your forms carefully and completely. If you have questions about a specific field or are unsure which forms apply to your situation, contact our office and a staff member will point you in the right direction.',
      ),
      step(
        'Step 3: Gather Supporting Documents',
        'Depending on the nature of your transfer, additional documentation may be required. Review the checklist on this page to confirm you have everything you need before submitting.',
      ),
      step(
        'Step 4: Submit Your Forms',
        'Once your forms are complete, submit them to the Land Bank office along with any required supporting documents. Forms can be submitted in person, by mail, or by email — whichever is most convenient for you.',
      ),
      step(
        'Step 5: Confirmation and Next Steps',
        'After your submission is received, a member of our staff will review your forms and follow up with any questions or next steps. We will keep you informed throughout the process and make sure everything is in order before your transfer is finalized.',
      ),
      text('Form Downloads', 'h2'),
      text('Basic Transfer Forms', 'h3'),
      text(
        "Starting your property transfer is straightforward — every transaction begins with Form 1, which is required for all transfers. If your sale involves an entity such as a trust, corporation, partnership, LLP, or LLC, you'll also need to complete Form 2 for each entity involved. Simply download the forms below, open them in Adobe Reader 9 or higher, and you're ready to get started.",
      ),
      downloads([
        'Form 1 - Required for all transfers',
        'Form 2 - Required when buyer and/ or seller is an entity',
      ]),
      text('Exemption and Exemption Forms', 'h3'),
      text(
        "Certain property transfers are exempt from the Land Bank's two percent transfer fee. If you believe your transaction may qualify for an exemption, review the exemption categories below to determine which applies to your situation. If an exemption applies, you will need to complete and submit the appropriate exemption form along with your transfer documents.",
      ),
      downloads([
        'Form A - Claim of A exemption',
        'Form B - Claim of B exemption',
        'Form C - Claim of C exemption',
        'Form D - Claim of D exemption',
      ]),
      text('Enabling Legislation', 'h2'),
      text(
        'Please review the Land Bank Act and Rules and Regulations for further clarification on the applicability of the Land Bank fee.',
      ),
    ],
  },
]

async function main() {
  const pages = await client.fetch<Array<{_id: string; blocks: number}>>(
    `*[_type == "page" && slug.current == $slug]{_id, "blocks": count(pageBuilder)}`,
    {slug: SLUG},
  )
  // Prefer the draft: it is what Studio shows and what a publish would replace.
  const target = pages.find((p) => p._id.startsWith('drafts.')) ?? pages[0]
  if (!target) throw new Error(`No page with slug "${SLUG}".`)
  if (target.blocks > 0) {
    console.log(`${target._id} already has ${target.blocks} blocks. Nothing to do.`)
    return
  }
  console.log(`${DRY_RUN ? '[dry run] ' : ''}Setting ${pageBuilder.length} blocks on ${target._id}`)
  if (DRY_RUN) return
  await client.patch(target._id).set({pageBuilder}).commit()
}

main()
