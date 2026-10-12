/**
 * Creates the Single Project Page settings with the Figma wording, if it does not exist.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedSingleProjectPage.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedSingleProjectPage.ts --with-user-token
 *
 * What it writes: one published `singleProjectPage` (fixed id, a singleton) via createIfNotExists,
 * so it NEVER overwrites Studio edits. The "more projects" body is the Figma lorem: replace it in
 * Studio. `archiveLink` is left empty (point it at the Projects page in Studio); until then the
 * eyebrow is plain text.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

const doc = {
  _id: 'singleProjectPage',
  _type: 'singleProjectPage',
  eyebrow: 'Projects',
  faqHeading: 'Project FAQs',
  moreProjects: {
    disabled: false,
    eyebrow: 'projects',
    body: 'Curabitur facilisi cubilia curae hac habitasse platea dictumst. Nisl malesuada lacinia integer nunc posuere ut hendrerit. Efficitur laoreet mauris pharetra vestibulum fusce dictum risus. Imperdiet mollis nullam volutpat porttitor ullamcorper rutrum gravida. Adipiscing elit quisque faucibus ex sapien vitae pellentesque. Ad litora torquent per conubia nostra inceptos himenaeos.',
    button: {buttonText: 'View all projects'},
    count: 3,
  },
}

async function main() {
  if (DRY_RUN) {
    console.log('Would createIfNotExists:', JSON.stringify(doc, null, 2))
    return
  }
  await client.createIfNotExists(doc)
  console.log('singleProjectPage is in place.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
