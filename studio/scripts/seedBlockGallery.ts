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
 * Run seedPhaseBContent.ts first so the Phase B blocks have documents to show.
 *
 * Block fields change over time: an existing gallery is not updated (this script never edits a
 * page), so remove it with --remove and seed again to pick up new or changed blocks.
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

  // A project for the Map Teaser's detail card, if the dataset has one.
  const featuredProject = await client.fetch<string | null>(`*[_type == "property"][0]._id`)
  const projectRefs = await client.fetch<string[]>(`*[_type == "property" && !(_id in path("drafts.**"))][0...3]._id`)

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
      eyebrow: 'Property transfers',
      heading: 'Getting started with property transfers',
      headingLevel: 'h2',
      buttons: [
        {
          _type: 'blockButton',
          _key: key(),
          label: 'Primary button',
          variant: 'primary',
          link: {_type: 'link', linkType: 'href', href: '/map'},
        },
        {
          _type: 'blockButton',
          _key: key(),
          label: 'Secondary button',
          variant: 'secondary',
          link: {_type: 'link', linkType: 'href', href: '/map'},
        },
        {
          _type: 'blockButton',
          _key: key(),
          label: 'Ghost button',
          variant: 'ghost',
          link: {_type: 'link', linkType: 'href', href: '/map'},
        },
      ],
      rightContent: [
        text('How it works', 'h3'),
        text('Everything you need to complete your property transfer is on our site.'),
        text('Basic transfer forms', 'h3'),
        text('Every transaction begins with Form 1, which is required for all transfers.'),
        bullet('First list item'),
        bullet('Second list item'),
        {
          _type: 'anchorLinks',
          _key: key(),
          links: [
            {
              _type: 'anchorLink',
              _key: key(),
              label: 'A link row with the arrow icon',
              icon: 'link',
              link: {_type: 'link', linkType: 'href', href: '/map'},
            },
            {
              _type: 'anchorLink',
              _key: key(),
              label: 'A download row with the download icon',
              icon: 'download',
              link: {_type: 'link', linkType: 'href', href: '/map'},
            },
            {
              // A page link with no page chosen: must not render a row.
              _type: 'anchorLink',
              _key: key(),
              label: 'Should not appear',
              icon: 'link',
              link: {_type: 'link', linkType: 'page'},
            },
          ],
        },
      ],
    },
    {
      _type: 'jumpNavContent',
      _key: key(),
      heading: 'Jump nav heading',
      headingLevel: 'h1',
      content: [
        text('Parking', 'h2'),
        text('Where to park.'),
        text('Parking', 'h2'),
        text('A duplicate heading, which gets a different id.'),
        text('Café & Bar!', 'h2'),
        text('Accents and punctuation are stripped from the id.'),
        text('A sub heading', 'h3'),
        text('Not part of the nav.'),
        {
          _type: 'anchorLinks',
          _key: key(),
          links: [
            {
              _type: 'anchorLink',
              _key: key(),
              label: 'A link row inside a jump nav section',
              icon: 'link',
              link: {_type: 'link', linkType: 'href', href: '/map'},
            },
            {
              _type: 'anchorLink',
              _key: key(),
              label: 'A download row inside a jump nav section',
              icon: 'download',
              link: {_type: 'link', linkType: 'href', href: '/map'},
            },
          ],
        },
      ],
    },
    {
      _type: 'imageCarousel',
      _key: key(),
      eyebrow: 'Image carousel',
      images: [
        {_key: key(), _type: 'carouselImage', image: imageValue(beach, 'Dionis Beach'), caption: 'Dionis Beach', link: {_type: 'link', linkType: 'href', href: '/map'}},
        {_key: key(), _type: 'carouselImage', image: imageValue(jetties, 'Jetties Beach'), caption: 'Jetties Beach'},
        {_key: key(), _type: 'carouselImage', image: imageValue(pond, 'Long Pond'), caption: 'Long Pond'},
        {_key: key(), _type: 'carouselImage', image: imageValue(beach, 'Dionis Beach'), caption: 'Dionis Beach again'},
      ],
    },
    {
      _type: 'timeline',
      _key: key(),
      // Twelve entries: more than the ten connector line lengths, so they cycle.
      entries: Array.from({length: 12}, (_, i) => ({
        _key: key(),
        _type: 'timelineEntry',
        year: String(1980 + i * 4),
        title: `Milestone ${i + 1}`,
        description: i % 3 === 2 ? undefined : 'What happened on this date on Nantucket.',
      })),
    },
    {
      _type: 'downloadBlock',
      _key: key(),
      downloads: [
        {_key: key(), _type: 'download', label: 'A labelled file', file: {_type: 'file', asset: ref(sample._id)}},
        {_key: key(), _type: 'download', file: {_type: 'file', asset: ref(sample._id)}},
      ],
    },
    {
      _type: 'mapTeaser',
      _key: key(),
      eyebrow: 'Our interactive map',
      heading: 'Find properties, explore the island.',
      body: 'Explore the full network of Land Bank properties across Nantucket with our interactive map.',
      ...(featuredProject ? {featuredProject: ref(featuredProject)} : {}),
      button: {
        _type: 'button',
        buttonText: 'View the map',
        link: {_type: 'link', linkType: 'href', href: '/map'},
      },
    },
    {
      // A button whose link points at no page: it must not render.
      _type: 'mapTeaser',
      _key: key(),
      heading: 'Map teaser, no featured property, unresolvable button',
      button: {_type: 'button', buttonText: 'Should not appear', link: {_type: 'link', linkType: 'page'}},
    },
    // Hidden: must be absent on the live site and badged in Presentation.
    {_type: 'mapTeaser', _key: key(), heading: 'Hidden map teaser', body: 'Should only appear in Presentation, with a Hidden badge.', disabled: true},
    {_type: 'contactForm', _key: key(), heading: 'Contact form'},
    {
      _type: 'heroTertiary',
      _key: key(),
      eyebrow: 'Hero - Tertiary, H2',
      heading: 'A section intro',
      headingLevel: 'h2',
      body: 'The same layout with an H2, used further down a page.',
    },
    {
      _type: 'heroSecondary',
      _key: key(),
      eyebrow: 'Conservation',
      body: 'Light brown variant: a light panel with the larger body size.',
      variant: 'light-brown',
      image: imageValue(jetties, 'Jetties Beach'),
    },
    {
      _type: 'missionStatement',
      _key: key(),
      eyebrow: 'Our mission',
      heading: 'Preserving Nantucket’s open spaces for the public while adapting to the island’s needs with balance, simplicity, and care.',
      links: [
        {_type: 'missionLink', _key: key(), label: 'Agriculture', link: {_type: 'link', linkType: 'href', href: '/map'}},
        {_type: 'missionLink', _key: key(), label: 'Conservation', link: {_type: 'link', linkType: 'href', href: '/map'}},
        {_type: 'missionLink', _key: key(), label: 'Should not appear', link: {_type: 'link', linkType: 'page'}},
      ],
    },
    {
      _type: 'ctaContact',
      _key: key(),
      heading: 'Contact Us',
      body: 'Have a question, need more information, or not sure where to start? Reach out.',
      button: {_type: 'button', buttonText: 'Reach out', link: {_type: 'link', linkType: 'href', href: '/map'}},
      desktopImage: {_type: 'image', asset: ref(beach)},
      mobileImage: {_type: 'image', asset: ref(beach)},
    },
    {
      _type: 'timeline',
      _key: key(),
      entries: [{_key: key(), _type: 'timelineEntry', year: '1983', title: 'The only milestone', description: 'One slide.'}],
    },

    {
      _type: 'newsPreview',
      _key: key(),
      heading: 'Nantucket News',
      count: 2,
      ctaHeading: 'Check out what is happening with the latest NLB news.',
      ctaLabel: 'View all news',
      ctaLink: {_type: 'link', linkType: 'href', href: '/map'},
    },
    {
      // The call to action link points at no page: the tile must be plain, not a dead link.
      _type: 'newsPreview',
      _key: key(),
      heading: 'News with an unresolvable call to action',
      count: 3,
      ctaHeading: 'This tile is not a link.',
      ctaLabel: 'Should not be a link',
      ctaLink: {_type: 'link', linkType: 'page'},
    },
    {_type: 'eventsPreview', _key: key(), eyebrow: 'Events - Upcoming', count: 2},
    {_type: 'eventsPreview', _key: key(), eyebrow: 'Events - one only', count: 1},
    {_type: 'faqList', _key: key(), heading: 'FAQs'},
    {_type: 'peopleGrid', _key: key(), heading: 'Staff', source: 'staff'},
    {_type: 'peopleGrid', _key: key(), heading: 'Commissioners', source: 'commissioners'},
    {_type: 'projectGrid', _key: key(), heading: 'Properties'},
    {
      _type: 'projectPreview',
      _key: key(),
      eyebrow: 'Projects - Conservation',
      body: 'Our conservation work does not stop at the property line. We partner with scientists, agencies and local organizations to monitor wildlife, restore habitat and track how the island is changing.',
      button: {_type: 'button', buttonText: 'View all projects', link: {_type: 'link', linkType: 'href', href: '/map'}},
      projects: projectRefs.slice(0, 3).map((id) => ({...ref(id), _key: key()})),
    },

    // Empty states: every optional field empty. These must render without error or junk.
    {_type: 'hero', _key: key()},
    {_type: 'heroSecondary', _key: key()},
    {_type: 'heroTertiary', _key: key()},
    {
      _type: 'basicLeftRightText',
      _key: key(),
      heading: 'Empty state: button with no link',
      // Text but a page link with no page chosen: it must not render a button.
      buttons: [
        {_type: 'blockButton', _key: key(), label: 'Should not appear', variant: 'primary', link: {_type: 'link', linkType: 'page'}},
      ],
      // An anchor links item with zero links renders nothing.
      rightContent: [{_type: 'anchorLinks', _key: key(), links: []}],
    },
    {_type: 'missionStatement', _key: key(), heading: 'Empty state: a statement with no links.'},
    {_type: 'ctaContact', _key: key()},
    {_type: 'jumpNavContent', _key: key()},
    {_type: 'imageCarousel', _key: key()},
    {_type: 'timeline', _key: key()},
    {_type: 'downloadBlock', _key: key()},
    {_type: 'mapTeaser', _key: key()},
    {_type: 'contactForm', _key: key()},
    {_type: 'newsPreview', _key: key(), count: 2},
    {_type: 'eventsPreview', _key: key(), count: 2},
    {_type: 'faqList', _key: key()},
    {_type: 'peopleGrid', _key: key(), source: 'staff'},
    {_type: 'projectGrid', _key: key()},
    {_type: 'projectPreview', _key: key()},
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
