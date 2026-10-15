/**
 * Creates the footer's newsletter signup as a PUBLISHED `form` ("Newsletter Signup": one required
 * email field) and points the `footer` singleton's `newsletterForm` at it.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedNewsletterForm.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedNewsletterForm.ts --with-user-token
 *
 * What it writes: one published `form` titled "Newsletter Signup" (Sanity generates the id),
 * matched on title among published documents and reused if one exists. It then sets
 * `footer.newsletterForm` ONLY when that field is empty. It never edits an existing form and never
 * overwrites a reference an editor has already chosen. A draft of the footer is not touched: if
 * the footer is open in Studio with unpublished changes, publish or discard them first.
 */

import {randomUUID} from 'node:crypto'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const TITLE = 'Newsletter Signup'

async function main() {
  let form = await client.fetch<{_id: string} | null>(
    `*[_type == "form" && title == $title && !(_id in path("drafts.**"))][0]{_id}`,
    {title: TITLE},
  )

  if (form) {
    console.log(`Reusing the existing "${TITLE}" form (${form._id}).`)
  } else if (DRY_RUN) {
    console.log(`[dry] Would create the published "${TITLE}" form.`)
  } else {
    const created = await client.create({
      _type: 'form',
      title: TITLE,
      submitLabel: 'Subscribe',
      successMessage: 'Thank you for subscribing.',
      sections: [
        {
          _key: randomUUID().slice(0, 8),
          _type: 'formSection',
          columns: 1,
          fields: [
            {
              _key: randomUUID().slice(0, 8),
              _type: 'formField',
              fieldType: 'email',
              label: 'Email address',
              name: {_type: 'slug', current: 'email'},
              placeholder: 'example@email.com',
              required: true,
              width: 'full',
            },
          ],
        },
      ],
    })
    form = {_id: created._id}
    console.log(`Created the "${TITLE}" form (${form._id}).`)
  }

  const footer = await client.fetch<{newsletterForm?: {_ref: string}} | null>(
    `*[_type == "footer" && _id == "footer"][0]{newsletterForm}`,
  )
  if (!footer) {
    console.log('No published footer document found; nothing to link.')
    return
  }
  if (footer.newsletterForm?._ref) {
    console.log(`footer.newsletterForm is already set (${footer.newsletterForm._ref}); leaving it.`)
    return
  }
  if (DRY_RUN) {
    console.log('[dry] Would set footer.newsletterForm.')
    return
  }
  if (!form) return
  await client
    .patch('footer')
    .set({newsletterForm: {_type: 'reference', _ref: form._id}})
    .commit()
  console.log('Linked footer.newsletterForm.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
