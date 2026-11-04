/**
 * Verifies how a property's gallery entries become carousel cards. There is no test framework, so
 * this is a plain script:
 *
 *   cd frontend && node scripts/verifyGalleryCards.mts
 *
 * Imports the real helper, not a copy. Exits non-zero on the first failure.
 */
import {galleryCards, type GalleryEntry} from '../sanity/lib/galleryCards.ts'

let failed = false
function same(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${message}`)
  if (!ok) {
    console.error(`       got      ${JSON.stringify(actual)}`)
    console.error(`       expected ${JSON.stringify(expected)}`)
    failed = true
  }
}

const img = (ref: string) => ({asset: {_ref: ref}, alt: 'alt'})
const doc = (
  docType: string,
  over: Partial<NonNullable<GalleryEntry['doc']>> = {},
): GalleryEntry['doc'] => ({
  docType,
  title: 'A title',
  slug: 'a-slug',
  externalUrl: null,
  image: img('image-1'),
  ...over,
})
const related = (key: string, d: GalleryEntry['doc']): GalleryEntry => ({
  _key: key,
  _type: 'reference',
  doc: d,
})
const upload = (key: string, over: Partial<GalleryEntry> = {}): GalleryEntry => ({
  _key: key,
  _type: 'image',
  asset: {_ref: 'image-up'},
  alt: 'Trail',
  caption: 'Trails',
  ...over,
})
const one = (entry: GalleryEntry) => galleryCards([entry])[0]
const keys = (entries: GalleryEntry[]) => galleryCards(entries).map((card) => card.key)

console.log('uploaded images')
same(one(upload('u1')).lightbox, true, 'an uploaded image opens a lightbox')
same(one(upload('u1')).href, null, 'and has no address')
same(one(upload('u1')).label, 'Trails', 'its caption is the label')
same(one(upload('u1', {caption: '  '})).label, null, 'a blank caption is no label')
same(keys([upload('u1', {asset: null})]), [], 'an upload with no file is dropped')

console.log('related documents: where each goes')
same(one(related('a', doc('article', {slug: 'spring'}))).href, '/news/spring', 'article')
same(one(related('p', doc('project', {slug: 'dune'}))).href, '/projects/dune', 'project')
same(one(related('r', doc('property', {slug: 'maxcy'}))).href, '/properties/maxcy', 'property')
same(one(related('e', doc('event', {slug: 'walk'}))).href, '/events/walk', 'event')
same(one(related('a', doc('article'))).lightbox, false, 'a document does not open a lightbox')
same(one(related('a', doc('article'))).label, 'A title', 'its title is the label')

console.log('an article with an external address')
const external = one(
  related('a', doc('article', {externalUrl: 'https://example.com/story', slug: 'spring'})),
)
same(
  [external.href, external.external],
  ['https://example.com/story', true],
  'goes there, flagged external',
)
same(
  one(related('a', doc('article', {externalUrl: '#', slug: 'spring'}))).href,
  '/news/spring',
  'a placeholder `#` falls back to its own page',
)
same(
  one(related('a', doc('article', {externalUrl: '/relative', slug: 'spring'}))).href,
  '/news/spring',
  'a non-http address is not followed',
)
same(
  one(related('a', doc('project', {externalUrl: 'https://x.example'}))).external,
  false,
  'only articles use the external URL',
)

console.log('what is dropped, never shown empty')
same(keys([related('x', null)]), [], 'an unpublished document (dereferences to null)')
same(keys([related('x', doc('article', {title: '  '}))]), [], 'no title')
same(keys([related('x', doc('article', {slug: null}))]), [], 'no slug and no external address')
same(keys([related('x', doc('article', {image: null}))]), [], 'no image at all')
same(keys([related('x', doc('article', {image: {asset: null}}))]), [], 'an image with no file')
same(keys([related('x', doc('page'))]), [], 'a type the gallery does not link to')

console.log('the entry type Studio stores')
same(
  keys([{...related('n', doc('project')), _type: 'relatedDocument'}]),
  ['n'],
  'a named relatedDocument member is a related document',
)
same(keys([{...related('r', doc('project')), _type: 'reference'}]), ['r'], 'so is a bare reference')

console.log('image alt text')
same(
  one(related('a', doc('event', {image: {asset: {_ref: 'i'}, alt: null}, title: 'Walk'}))).image
    .alt,
  'Walk',
  'falls back to the title when the image has no alt',
)
same(
  one(related('a', doc('event', {image: {asset: {_ref: 'i'}, alt: 'A dune'}}))).image.alt,
  'A dune',
  'keeps the image’s own alt text',
)

console.log('order and mixing')
same(
  keys([
    upload('1'),
    related('2', doc('project')),
    related('3', null),
    upload('4'),
    related('5', doc('article')),
  ]),
  ['1', '2', '4', '5'],
  'keeps authored order and drops only the broken entry',
)
same(galleryCards(null), [], 'no gallery is no cards')
same(galleryCards([]), [], 'an empty gallery is no cards')

if (failed) process.exit(1)
console.log('\nall ok')
