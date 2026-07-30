/**
 * Backfills the popup content fields on the seeded projects - image, description and link.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedProjectContent.ts --with-user-token
 *
 * These fields were added after seedProjects.ts ran, and that script deliberately leaves existing
 * projects untouched, so it will not fill them in. This does, from the sample content that used to
 * live in frontend/app/map/properties.ts, so the map popups keep looking the way they were designed.
 *
 * Idempotent and non-destructive: every field is written with setIfMissing, and an image is only
 * uploaded when the project has none. Re-running changes nothing.
 *
 * The descriptions are the placeholder copy from that sample data - real copy still has to be
 * written. The links are all '#'.
 *
 * Pass --dry to print the plan without writing.
 */

import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'})

const DRY_RUN = process.argv.includes('--dry')

const IMAGE_DIR = join(__dirname, '..', '..', 'frontend', 'public', 'images', 'properties')

const PLACEHOLDER_DESCRIPTION =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.'

/**
 * Project slug -> image filename. Not derivable: several files differ from the slug, and two use
 * a different extension.
 */
const CONTENT: {slug: string; image: string; alt: string}[] = [
  {slug: 'surfside-beach', image: 'surfside-beach.jpg', alt: 'Surfside Beach'},
  {slug: 'jetties-beach', image: 'jetties-beach.jpg', alt: 'Jetties Beach'},
  {slug: 'madaket-beach', image: 'madaket-beach.jpg', alt: 'Madaket Beach'},
  {slug: 'sanford-farm-trail', image: 'sanford-farm.webp', alt: 'Sanford Farm'},
  {slug: 'middle-moors-trail', image: 'middle-moores.jpeg', alt: 'Middle Moors'},
  {slug: 'nantucket-harbor', image: 'nantucket-harbor.png', alt: 'Nantucket Harbor'},
  {slug: 'long-pond', image: 'long-pond.jpg', alt: 'Long Pond'},
  {slug: 'dionis-beach', image: 'dionis-beach.jpg', alt: 'Dionis Beach'},
]

type ProjectRow = {_id: string; hasImage: boolean}

async function main() {
  if (DRY_RUN) console.log('DRY RUN - nothing will be written.\n')

  let updated = 0
  let skipped = 0

  for (const entry of CONTENT) {
    const project = await client.fetch<ProjectRow | null>(
      `*[_type == "project" && slug.current == $slug][0]{_id, "hasImage": defined(image.asset)}`,
      {slug: entry.slug},
    )

    if (!project) {
      console.warn(`  ! no project with slug "${entry.slug}" - run seedProjects.ts first`)
      continue
    }

    const imagePath = join(IMAGE_DIR, entry.image)
    const imageExists = existsSync(imagePath)
    if (!imageExists) {
      console.warn(`  ! image not found, skipping image only: ${imagePath}`)
    }

    if (project.hasImage) {
      console.log(`  = ${entry.slug}: image already set`)
    }

    if (DRY_RUN) {
      const parts = [
        project.hasImage || !imageExists ? null : `upload ${entry.image}`,
        'set description and link if missing',
      ].filter(Boolean)
      console.log(`  ~ would ${parts.join(', ')} on ${entry.slug}`)
      updated++
      continue
    }

    const patch = client.patch(project._id).setIfMissing({
      description: PLACEHOLDER_DESCRIPTION,
      link: '#',
    })

    if (!project.hasImage && imageExists) {
      const asset = await client.assets.upload('image', readFileSync(imagePath), {
        filename: entry.image,
      })
      patch.setIfMissing({
        image: {
          _type: 'image',
          asset: {_type: 'reference', _ref: asset._id},
          alt: entry.alt,
        },
      })
      console.log(`  + ${entry.slug}: uploaded ${entry.image} (${asset._id})`)
    }

    const result = await patch.commit()
    if (result) {
      updated++
      console.log(`  ~ ${entry.slug}: content written`)
    } else {
      skipped++
    }
  }

  console.log(`\n${DRY_RUN ? 'Would update' : 'Updated'} ${updated} project(s).`)
  if (skipped) console.log(`${skipped} unchanged.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
