/**
 * Verifies the WordPress FAQ transform (faqs.ts). No test framework, so a plain script:
 *
 *   cd studio && node scripts/wordpress/verifyFaqsTransform.mts
 *
 * Imports the real module, not a copy. Exits non-zero on failure.
 */
import {htmlToBlocks, planFaqCategories, planFaqs} from './faqs.ts'

let failed = false
function same(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
    failed = true
  }
}

const span = (key: string, text: string, marks: string[] = []) => ({_type: 'span', _key: key, text, marks})
const para = (key: string, children: unknown[], markDefs: unknown[] = []) => ({
  _type: 'block',
  _key: key,
  style: 'normal',
  markDefs,
  children,
})

// The one real answer on the site: a Gutenberg paragraph with a mailto link.
const real = `<!-- wp:paragraph -->
<p>To report an issue call (508) 228-7240 or email us at <a href="mailto:info@nantucketlandbank.org">info@nantucketlandbank.org</a></p>
<!-- /wp:paragraph -->`
same(
  htmlToBlocks(real, 'a').blocks,
  [
    para(
      'a-0',
      [
        span('a-0-0', 'To report an issue call (508) 228-7240 or email us at '),
        span('a-0-1', 'info@nantucketlandbank.org', ['a-0-l0']),
      ],
      [{_type: 'link', _key: 'a-0-l0', linkType: 'href', href: 'mailto:info@nantucketlandbank.org', openInNewTab: false}],
    ),
  ],
  'a paragraph with a mailto link becomes a block with a link annotation',
)

same(htmlToBlocks('', 'a'), {blocks: [], issues: []}, 'empty content gives no blocks')
same(htmlToBlocks('  \n<!-- wp:paragraph -->\n<!-- /wp:paragraph -->', 'a').blocks, [], 'comments and whitespace alone give no blocks')

same(
  htmlToBlocks('<p>Fish &amp; <strong>chips</strong> and <em>peas</em>&nbsp;too</p>', 'a').blocks,
  [para('a-0', [span('a-0-0', 'Fish & '), span('a-0-1', 'chips', ['strong']), span('a-0-2', ' and '), span('a-0-3', 'peas', ['em']), span('a-0-4', ' too')])],
  'decodes entities and maps strong and em to decorators',
)

same(
  htmlToBlocks('<p>One</p>\n\n<p>Two</p>', 'a').blocks.map((b: {children: Array<{text: string}>}) => b.children[0].text),
  ['One', 'Two'],
  'each paragraph is its own block',
)

same(
  htmlToBlocks('<h2>Big</h2><h4>Small</h4>', 'a').blocks.map((b: {style: string}) => b.style),
  ['h3', 'h4'],
  'H1 and H2 become H3, since the editor offers no higher',
)
same(htmlToBlocks('<h2>Big</h2>', 'a').issues.length, 1, 'a promoted heading is reported')

const list = htmlToBlocks('<ul><li>Apples</li><li>Pears</li></ul><ol><li>First</li></ol>', 'a').blocks as Array<{
  listItem: string
  level: number
  children: Array<{text: string}>
}>
same(
  list.map((b) => [b.listItem, b.level, b.children[0].text]),
  [['bullet', 1, 'Apples'], ['bullet', 1, 'Pears'], ['number', 1, 'First']],
  'list items become list blocks',
)

same(
  htmlToBlocks('<p>Line one<br>Line two</p>', 'a').blocks[0].children.map((c: {text: string}) => c.text).join('|'),
  'Line one\nLine two',
  'a line break stays inside the block as a newline',
)

same(
  htmlToBlocks('First paragraph.\n\nSecond paragraph.', 'a').blocks.map((b: {children: Array<{text: string}>}) => b.children[0].text),
  ['First paragraph.', 'Second paragraph.'],
  'classic-editor text without tags splits on blank lines',
)

same(
  htmlToBlocks('<blockquote><p>Quoted</p></blockquote>', 'a').blocks.map((b: {style: string}) => b.style),
  ['blockquote'],
  'a blockquote keeps its style',
)

const withImage = htmlToBlocks('<p>Text</p><img src="x.jpg" alt="x">', 'a')
same(withImage.blocks.length, 1, 'an image is not carried into the answer')
same(withImage.issues.length, 1, 'a dropped image is reported')

const relative = htmlToBlocks('<p><a href="/about-us/staff">Staff</a></p>', 'a')
same(relative.blocks[0].markDefs.length, 0, 'a site-relative link is not stored (the editor rejects it)')
same(relative.blocks[0].children[0].text, 'Staff', 'its text is kept')
same(relative.issues.length, 1, 'a dropped relative link is reported')

same(
  htmlToBlocks('<p><a href="https://example.org/x?a=1&amp;b=2" target="_blank">Out</a></p>', 'a').blocks[0].markDefs[0],
  {_type: 'link', _key: 'a-0-l0', linkType: 'href', href: 'https://example.org/x?a=1&b=2', openInNewTab: true},
  'target=_blank sets openInNewTab and the href is decoded',
)

// --- categories and FAQs -------------------------------------------------------------------
same(
  planFaqCategories([
    {termId: 57, slug: 'form-filing', name: 'Form Filing', termOrder: 1},
    {termId: 58, slug: 'general-faqs', name: 'General FAQs', termOrder: 0},
    {termId: 59, slug: 'tied', name: 'Tied &amp; Co', termOrder: 1},
  ]),
  [
    {slug: 'general-faqs', title: 'General FAQs', order: 10},
    {slug: 'form-filing', title: 'Form Filing', order: 20},
    {slug: 'tied', title: 'Tied & Co', order: 30},
  ],
  'categories follow the term order, then term id, in steps of 10, with decoded titles',
)

const faq = (wpId: number, question: string, extra: Record<string, unknown> = {}) => ({
  wpId,
  status: 'publish',
  question,
  menuOrder: 0,
  content: '<p>Answer</p>',
  categories: [{slug: 'general-faqs', name: 'General FAQs'}],
  ...extra,
})
const categories = [
  {termId: 57, slug: 'form-filing', name: 'Form Filing', termOrder: 1},
  {termId: 58, slug: 'general-faqs', name: 'General FAQs', termOrder: 0},
]
const plan = planFaqs({
  categories,
  faqs: [
    faq(590, 'Last ID', {categories: [{slug: 'form-filing', name: 'Form Filing'}]}),
    faq(585, 'B  &amp;  more?', {menuOrder: 5}),
    faq(584, 'Zeroth'),
    faq(586, 'Empty answer', {content: ''}),
    faq(587, 'A draft', {status: 'draft'}),
    faq(591, 'No category', {categories: []}),
    faq(592, 'Two categories', {categories: [{slug: 'form-filing', name: 'Form Filing'}, {slug: 'general-faqs', name: 'General FAQs'}]}),
  ],
})
same(
  plan.faqs.map((f) => [f.wpId, f.categorySlug ?? null, f.order]),
  [[584, 'general-faqs', 10], [586, 'general-faqs', 20], [592, 'general-faqs', 30], [585, 'general-faqs', 40], [590, 'form-filing', 10], [591, null, 10]],
  'published FAQs only, grouped by category order, then menu order, then id; the earliest category wins',
)
same(plan.faqs.find((f) => f.wpId === 585)?.question, 'B & more?', 'the question is decoded and its spacing collapsed')
same(plan.faqs.find((f) => f.wpId === 586)?.answer, [], 'an empty answer stays empty')
same(plan.issues.filter((i) => i.includes('586')).length, 1, 'an empty answer is reported')
same(plan.issues.filter((i) => i.includes('591')).length, 1, 'a FAQ with no category is reported')
same(plan.issues.filter((i) => i.includes('592')).length, 1, 'a FAQ in two categories is reported')
same(plan.issues.some((i) => i.includes('587')), false, 'a draft is skipped silently')
same(
  plan.faqs.find((f) => f.wpId === 584)?.answer.map((b: {_key: string}) => b._key),
  ['wp584-0'],
  'answer keys are derived from the WordPress id, so they are stable',
)

process.exit(failed ? 1 : 0)
