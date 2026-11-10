/**
 * Migrates the page content and slider images of one property from the live site,
 * "Miacomet Golf Course" (https://www.nantucketlandbank.org/property/miacomet-golf-course/, read
 * 2026-11-09), onto the EXISTING `property` document with that slug.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedMiacometGolfContent.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedMiacometGolfContent.ts --with-user-token
 *
 * What it writes: `about` (intro, the course-website link, an "Address" Heading 2 and the
 * "Directions" Heading 3, as the site words them) and `gallery` (the seven slider images, full size,
 * downloaded from the old media library and uploaded as assets). It patches every copy of the
 * property (draft and/or published) and sets a field ONLY if it is currently empty - an edited
 * About or Gallery is never overwritten. Nothing else on the property changes.
 *
 * Not migrated: the "Property Marker" sign-post block (site-wide boilerplate, same on every
 * property) and the sidebar sections (Request a Map, Leave No Trace, Pet Owners, Report an Issue).
 *
 * --dry prints the plan and writes nothing (it does not download the images).
 */

import {getCliClient} from 'sanity/cli'

import {htmlToBlocks} from './wordpress/faqs'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'miacomet-golf-course'
const UPLOADS = 'https://www.nantucketlandbank.org/wp-content/uploads/'

const ABOUT_HTML = `
<p>One of the Land Bank’s earliest acquisitions, Miacomet Golf was purchased as a 9-hole course from a private owner to preserve it as a public recreational facility in perpetuity. In 2003, the Land Bank expanded the course to 18 holes and subsequently renovated the original fairways and tees. Currently, Miacomet is the only public, 18-hole golf course on Nantucket. There is a clubhouse with a restaurant on the premises.</p>
<p>The Land Bank invites you to visit <a href="https://www.miacometgolf.com/">their website</a> or contact the course at 508-325-0335 for additional information.</p>
<h2>Address</h2>
<p>12 W. Miacomet Road.</p>
<h3>Directions</h3>
<p>Take Surfside Road to Bartlett Road, which becomes Raceway Drive after a sharp right turn. At the stop sign, take a left onto Somerset Road. Follow Somerset around to the left and then proceed straight onto West Miacomet Road. The clubhouse and parking lot are located on West Miacomet Road.</p>
`

// Slider order on the old page; alt text as the site has it (one double space tidied).
const SLIDES = [
  {file: 'Miacomet_GolfCourse.jpg', alt: 'Miacomet Golf Course'},
  {file: 'Miacomet_GolfCourse-1.jpg', alt: 'Miacomet Golf Course'},
  {file: 'Miacomet_GolfCourse-from-the-rough.jpg', alt: 'Miacomet Golf Course View from the Rough'},
  {file: 'Miacomet_GolfCourse-green-from-sand.jpg', alt: 'Miacomet Golf Course View from a Sand Trap'},
  {file: 'Miacomet_GolfCourse-green-with-trees-in-background.jpg', alt: 'Miacomet Golf Course Green with Trees in the Background'},
  {file: 'Miacomet_GolfCourse-in-morning-fog.jpg', alt: 'Miacomet Golf Course in Morning Fog'},
  {file: 'Miacomet_GolfCourse-t-box-in-morning-fog.jpg', alt: 'Miacomet Golf Course view from the tee box'},
]

async function main() {
  const docs = await client.fetch<Array<{_id: string; about?: unknown[]; gallery?: unknown[]}>>(
    `*[_type == "property" && slug.current == $slug]{_id, about, gallery}`,
    {slug: SLUG},
  )
  if (docs.length === 0) throw new Error(`No property with slug ${SLUG}.`)

  const {blocks, issues} = htmlToBlocks(ABOUT_HTML, 'miacomet')
  issues.forEach((issue) => console.log(`  ! ${issue}`))
  // The converter turns every H2 into an H3; the About field allows Heading 2, which is what the site used.
  const about = blocks.map((b) =>
    b.style === 'h3' && b.children.map((c) => c.text).join('') === 'Address' ? {...b, style: 'h2'} : b,
  )

  for (const doc of docs) {
    console.log(
      `${doc._id}: about ${doc.about?.length ? 'has content - left alone' : `will get ${about.length} blocks`}; ` +
        `gallery ${doc.gallery?.length ? 'has content - left alone' : `will get ${SLIDES.length} images`}`,
    )
  }
  if (DRY_RUN) {
    console.log('[dry run] nothing written.')
    return
  }

  const needGallery = docs.some((d) => !d.gallery?.length)
  let gallery: unknown[] = []
  if (needGallery) {
    for (const [i, slide] of SLIDES.entries()) {
      const res = await fetch(UPLOADS + slide.file)
      if (!res.ok) throw new Error(`Could not download ${UPLOADS + slide.file}: HTTP ${res.status}`)
      const asset = await client.assets.upload('image', Buffer.from(await res.arrayBuffer()), {
        filename: slide.file,
      })
      gallery.push({
        _type: 'image',
        _key: `miacomet-slide-${i + 1}`,
        asset: {_type: 'reference', _ref: asset._id},
        alt: slide.alt,
      })
    }
  }

  for (const doc of docs) {
    const set: Record<string, unknown> = {}
    if (!doc.about?.length) set.about = about
    if (!doc.gallery?.length) set.gallery = gallery
    if (Object.keys(set).length === 0) continue
    await client.patch(doc._id).set(set).commit()
    console.log(`  patched ${doc._id}: ${Object.keys(set).join(', ')}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
