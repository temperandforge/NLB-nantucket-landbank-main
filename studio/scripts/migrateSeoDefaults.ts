/**
 * Copies the site's old SEO defaults into their new homes on the Settings singleton.
 *
 *   npx sanity exec scripts/migrateSeoDefaults.ts --with-user-token [--dry]
 *
 * What it writes, and only when the destination is empty:
 *   - `seo.image`  <- `ogImage` (the image, with its alt text)
 *   - `siteUrl`    <- `ogImage.metadataBase`, when that is an absolute https URL
 *
 * It never overwrites a value that is already set, never touches the old `ogImage` field (it is
 * left in the data, unused, once the site reads `seo.image`), and only patches the published
 * document: a pending draft is reported so its editor can decide. Idempotent: a second run
 * finds nothing to do. `--dry` prints the plan and writes nothing.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'})
const dry = process.argv.includes('--dry')

const SETTINGS_ID = 'siteSettings'

type Settings = {
  _id: string
  siteUrl?: string
  seo?: {image?: {asset?: {_ref?: string}}}
  ogImage?: {asset?: {_ref?: string}; alt?: string; hotspot?: unknown; crop?: unknown; metadataBase?: string}
}

function isHttps(value: string | undefined): value is string {
  try {
    return Boolean(value) && new URL(value as string).protocol === 'https:'
  } catch {
    return false
  }
}

async function main() {
  const [published, draft] = await Promise.all([
    client.getDocument<Settings>(SETTINGS_ID),
    client.getDocument<Settings>(`drafts.${SETTINGS_ID}`),
  ])
  if (!published) {
    console.log(`No published settings document (${SETTINGS_ID}); nothing to migrate.`)
    return
  }
  if (draft) console.log('Note: settings has an unpublished draft; it is not patched. Re-run after publishing.')

  const set: Record<string, unknown> = {}

  const ogImage = published.ogImage
  if (ogImage?.asset?._ref && !published.seo?.image?.asset?._ref) {
    const {metadataBase: _metadataBase, ...image} = ogImage as Record<string, unknown>
    set['seo.image'] = {_type: 'image', ...image}
    console.log('plan: seo.image <- ogImage')
  }
  if (!published.siteUrl && isHttps(ogImage?.metadataBase)) {
    set.siteUrl = ogImage.metadataBase
    console.log(`plan: siteUrl <- ${ogImage.metadataBase}`)
  } else if (!published.siteUrl && ogImage?.metadataBase) {
    console.log(`skip: ogImage.metadataBase "${ogImage.metadataBase}" is not an absolute https URL; set Site URL in Studio.`)
  }

  if (Object.keys(set).length === 0) {
    console.log('Nothing to do.')
    return
  }
  if (dry) {
    console.log('--dry: no changes written.')
    return
  }
  // A dotted `set` path does not create a missing parent object, hence setIfMissing first.
  await client.patch(SETTINGS_ID).setIfMissing({seo: {_type: 'seo'}}).set(set).commit()
  console.log('Settings updated.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
