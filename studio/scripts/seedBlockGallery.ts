/**
 * Creates one page, "Block gallery", containing every page-builder block, so the blocks can be
 * checked in one place. Followed by an "Empty states" run: the same blocks with every optional
 * field empty, which must render without error.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedBlockGallery.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedBlockGallery.ts --with-user-token
 *   npx sanity exec scripts/seedBlockGallery.ts --with-user-token -- --publish
 *   npx sanity exec scripts/seedBlockGallery.ts --with-user-token -- --remove
 *
 * What it writes: one `page` document with slug "block-gallery", created as an unpublished draft
 * (or published, with --publish), plus the sample image and file assets it references (uploads are
 * content-addressed, so re-running reuses them). Idempotent: if a page with that slug exists in
 * any state, it does nothing. It never overwrites or edits an existing page.
 *
 * --remove deletes the gallery page (draft and published) after printing what it will delete.
 * --publish makes the gallery publicly visible on the live site until it is removed: only use it
 * when that is acceptable. --dry prints the plan without writing, and combines with --remove.
 */

import {randomUUID} from 'node:crypto'
import {createReadStream} from 'node:fs'
import {resolve} from 'node:path'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const PUBLISH = process.argv.includes('--publish')
const REMOVE = process.argv.includes('--remove')
const SLUG = 'block-gallery'

const key = () => randomUUID().slice(0, 8)

const text = (value: string, style = 'normal', extra: Record<string, unknown> = {}) => ({
  _type: 'block',
  _key: key(),
  style,
  markDefs: [],
  children: [{_type: 'span', _key: key(), text: value, marks: []}],
  ...extra,
})

const bullet = (value: string) => text(value, 'normal', {listItem: 'bullet', level: 1})

const ref = (id: string) => ({_type: 'reference' as const, _ref: id})
const imageValue = (id: string, alt: string) => ({_type: 'image', asset: ref(id), alt})

function findGallery() {
  return client.fetch<string[]>(`*[_type == "page" && slug.current == $slug]._id`, {slug: SLUG})
}

async function removeGallery() {
  const ids = await findGallery()
  console.log(
    `${DRY_RUN ? '[dry run] ' : ''}Deleting ${ids.length} document(s): ${ids.join(', ') || '(none)'}`,
  )
  if (DRY_RUN || ids.length === 0) return
  const tx = client.transaction()
  ids.forEach((id) => tx.delete(id))
  await tx.commit()
}

async function uploadImage(file: string) {
  const path = resolve(__dirname, '../../frontend/public/images/properties', file)
  const asset = await client.assets.upload('image', createReadStream(path), {filename: file})
  return asset._id
}

async function main() {
  if (REMOVE) return removeGallery()

  const existing = await findGallery()
  if (existing.length > 0) {
    console.log(`Block gallery already exists (${existing.join(', ')}). Nothing to do.`)
    return
  }
  if (DRY_RUN) {
    console.log('[dry run] Would upload 3 images and 1 file, and create the Block gallery page.')
    return
  }

  const [beach, jetties, pond] = await Promise.all([
    uploadImage('dionis-beach.jpg'),
    uploadImage('jetties-beach.jpg'),
    uploadImage('long-pond.jpg'),
  ])
  const sample = await client.assets.upload('file', Buffer.from('Sample download'), {
    filename: 'sample-download.txt',
    contentType: 'text/plain',
  })

  const pageBuilder = [
    {
      _type: 'hero',
      _key: key(),
      eyebrow: 'Hero',
      heading: 'A centred hero heading',
      body: 'An intro paragraph under the heading, limited to a readable measure.',
      image: imageValue(beach, 'Dionis Beach'),
    },
    {
      _type: 'heroImage',
      _key: key(),
      eyebrow: 'Hero - Image',
      heading: 'A short, punchy headline goes here.',
      image: imageValue(jetties, 'Jetties Beach'),
    },
    {
      _type: 'heroSecondary',
      _key: key(),
      eyebrow: 'Our history',
      body: 'Lowlands variant: a coloured panel beside an image.',
      variant: 'lowlands',
      image: imageValue(pond, 'Long Pond'),
    },
    {
      _type: 'heroSecondary',
      _key: key(),
      body: 'Moody Moor variant, with no eyebrow so the page name is used.',
      variant: 'moody-moor',
      image: imageValue(beach, 'Dionis Beach'),
    },
    {
      _type: 'heroTertiary',
      _key: key(),
      eyebrow: 'Hero - Tertiary',
      heading: 'Text-only hero heading',
      body: 'Intro text on the right at desktop widths, stacked below on mobile.',
    },
    {
      _type: 'basicLeftRightText',
      _key: key(),
      eyebrow: 'Basic - Left Right Text',
      heading: 'Left column heading',
      headingLevel: 'h2',
      body: [text('Left column body text that stays in view while the right column scrolls.')],
      button: {
        _type: 'button',
        buttonText: 'A real link',
        link: {_type: 'link', linkType: 'href', href: '/map'},
      },
      rightContent: [
        text('Right column heading', 'h3'),
        text('Right column paragraph.'),
        bullet('First list item'),
        bullet('Second list item'),
        {...imageValue(pond, 'Long Pond'), _key: key()},
      ],
    },
    {
      _type: 'jumpNavContent',
      _key: key(),
      heading: 'Jump nav heading',
      headingLevel: 'h1',
      content: [
        text('Parking', 'h3'),
        text('Where to park.'),
        text('Parking', 'h3'),
        text('A duplicate heading, which gets a different id.'),
        text('Café & Bar!', 'h3'),
        text('Accents and punctuation are stripped from the id.'),
        text('A sub heading', 'h4'),
        text('Not part of the nav.'),
      ],
    },
    {
      _type: 'imageCarousel',
      _key: key(),
      eyebrow: 'Image carousel',
      images: [
        {_key: key(), _type: 'carouselImage', image: imageValue(beach, 'Dionis Beach'), caption: 'Dionis Beach'},
        {_key: key(), _type: 'carouselImage', image: imageValue(jetties, 'Jetties Beach'), caption: 'Jetties Beach'},
        {_key: key(), _type: 'carouselImage', image: imageValue(pond, 'Long Pond'), caption: 'Long Pond'},
        {_key: key(), _type: 'carouselImage', image: imageValue(beach, 'Dionis Beach'), caption: 'Dionis Beach again'},
      ],
    },
    {
      _type: 'timeline',
      _key: key(),
      entries: [
        {_key: key(), _type: 'timelineEntry', year: '1983', title: 'First milestone', description: 'What happened.'},
        {_key: key(), _type: 'timelineEntry', year: '1990', title: 'Second milestone', description: 'What happened next.'},
        {_key: key(), _type: 'timelineEntry', year: '2001', title: 'Third milestone'},
        {_key: key(), _type: 'timelineEntry', year: '2015', title: 'Fourth milestone', description: 'And more.'},
        {_key: key(), _type: 'timelineEntry', year: '2024', title: 'Fifth milestone', description: 'Today.'},
      ],
    },
    {
      _type: 'downloadBlock',
      _key: key(),
      downloads: [
        {_key: key(), _type: 'download', label: 'A labelled file', file: {_type: 'file', asset: ref(sample._id)}},
        {_key: key(), _type: 'download', file: {_type: 'file', asset: ref(sample._id)}},
      ],
    },
    {_type: 'mapTeaser', _key: key(), heading: 'Map teaser', body: 'A short line above the map preview placeholder.'},
    {_type: 'contactForm', _key: key(), heading: 'Contact form'},

    // Empty states: every optional field empty. These must render without error or junk.
    {_type: 'hero', _key: key()},
    {_type: 'heroSecondary', _key: key()},
    {_type: 'heroTertiary', _key: key()},
    {
      _type: 'basicLeftRightText',
      _key: key(),
      heading: 'Empty state: button with no link',
      // Text but a page link with no page chosen: it must not render a button.
      button: {_type: 'button', buttonText: 'Should not appear', link: {_type: 'link', linkType: 'page'}},
    },
    {_type: 'jumpNavContent', _key: key()},
    {_type: 'imageCarousel', _key: key()},
    {_type: 'timeline', _key: key()},
    {_type: 'downloadBlock', _key: key()},
    {_type: 'mapTeaser', _key: key()},
    {_type: 'contactForm', _key: key()},
  ]

  const doc = {
    _type: 'page',
    name: 'Block gallery',
    slug: {_type: 'slug', current: SLUG},
    pathOnly: false,
    pageBuilder,
  }

  // 'drafts.' (nothing after the dot) makes Sanity generate the id, so the draft has no explicit id.
  const stub: typeof doc & {_id?: string} = PUBLISH ? doc : {...doc, _id: 'drafts.'}
  const created = await client.create(stub)
  console.log(`Created ${created._id}${PUBLISH ? ' (published)' : ' (draft)'}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
