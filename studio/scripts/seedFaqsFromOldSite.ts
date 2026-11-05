/**
 * Adds the 13 FAQs from the live site (https://www.nantucketlandbank.org/about/faqs/, read
 * 2026-11-05) as DRAFTS, and fills in answers the WordPress import left empty.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedFaqsFromOldSite.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedFaqsFromOldSite.ts --with-user-token
 *
 * What it writes:
 *   - a new draft `faq` for each question not already in the dataset (matched on the question, with
 *     case, spacing, punctuation and "&" vs "and" ignored, among published documents and drafts),
 *     referencing its category by slug and ranked after every existing FAQ;
 *   - for a question that exists with NO answer, the answer, on that FAQ's draft (a draft is made
 *     from the published document if there is none), so the live site does not change until the draft
 *     is published.
 * It never edits an answer that already has content, never touches a published document directly,
 * and deletes nothing. Re-running changes nothing once everything is in place.
 *
 * Answers are converted from the source HTML to Portable Text by the WordPress importer's converter
 * (wordpress/faqs.ts). Links keep the address they have on the old site; see the report line at the
 * end for the ones that point at old-site pages.
 *
 * --dry prints the plan and writes nothing.
 */

import {LexoRank} from 'lexorank'
import {getCliClient} from 'sanity/cli'

import {htmlToBlocks, type PortableTextBlock} from './wordpress/faqs'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const PHONE = '<a href="tel:+15082287240">(508) 228-7240</a>'
const mail = (address: string) => `<a href="mailto:${address}">${address}</a>`
const OLD = 'https://www.nantucketlandbank.org'

type Source = {question: string; category: 'general-faqs' | 'form-filing'; html: string}

// Order is the order on the live page.
const SOURCE: Source[] = [
  {
    question: 'What is the best way to notify the Land Bank that there is an issue on one of the properties?',
    category: 'general-faqs',
    html: `<p>To report an issue call ${PHONE} or email us at ${mail('info@nantucketlandbank.org')}.</p>`,
  },
  {
    question: 'Where can I get Land Bank paper maps?',
    category: 'general-faqs',
    html: `<p>Land Bank maps are available at the Land Bank office at 22 Broad Street, or you can call us at ${PHONE} or email us at ${mail('info@nantucketlandbank.org')} to have a copy mailed to you.</p>`,
  },
  {
    question: 'Does the Land Bank have a lost & found?',
    category: 'general-faqs',
    html: `<p>Valuables are turned into the police department. To locate other missing items (e.g., clothing, shoes, keys, wallets etc.), please call us at ${PHONE} or email us at ${mail('assistant@nantucketlandbank.org')} to confirm if we have the item, and to arrange a pick up time.</p>`,
  },
  {
    question: 'Can I hold events on Land Bank property?',
    category: 'general-faqs',
    html: `<p>Yes, please email ${mail('execassist@nantucketlandbank.org')} if you are interested in holding an event on Land Bank property.</p>`,
  },
  {
    question: 'Can you hunt on Land Bank properties?',
    category: 'general-faqs',
    html: `<p>Most Land Bank properties are open to hunting during the appropriate season. <a href="${OLD}/properties/hunting-guidelines/">Click here to find the most up to date Land Bank hunting season information.</a></p>`,
  },
  {
    question: 'Does the Land Bank provide trash receptacles?',
    category: 'general-faqs',
    html: '<p>In most cases, there are no trash receptacles provided at Land Bank properties, so please help keep our properties clean by taking everything that you brought with you when you leave.</p>',
  },
  {
    question: 'Which Land Bank Properties are ADA accessible?',
    category: 'general-faqs',
    html: `<p>View a list of the Land Bank’s accessible properties here: <a href="${OLD}/properties/handicap-accessible-properties/">Accessible Properties</a>.</p>`,
  },
  {
    question: 'Can I file Land Bank Forms electronically?',
    category: 'form-filing',
    html: `<p>Not at this time. For more commonly asked filing questions click here: <a href="${OLD}/filing/faq/">${OLD}/filing/faq/</a>.</p>`,
  },
  {
    question: 'Can I drive my vehicle on Land Bank beaches?',
    category: 'general-faqs',
    html: '<p>4-wheel drive vehicles are allowed to drive on certain Nantucket beaches with the appropriate town beach permit. <a href="https://www.nantucket-ma.gov/266/Beach-Vehicle-Permits">Information on town beach permits</a> can be obtained from the Town of Nantucket. Land Bank beaches that accommodate permitted vehicle access include 40th Pole, Point of Breakers, and Cathcart Beach.</p>',
  },
  {
    question: 'Can I store my dinghy/kayak on Land Bank beaches over the summer?',
    category: 'general-faqs',
    html: '<p>Land Bank beaches do not allow for year round boat storage. From 4/2-10/31, individuals may store their non-motorized watercraft (e.g., kayaks, dinghys, etc.) at Cathcart Beach, Settlers Landing, Jackson Point, West End Overlook, and Holly Farm. From 11/1 to 4/1, non-motorized watercraft are <strong>not</strong> allowed to be stored on Land Bank beaches and will be removed. Please note that the Land Bank has very limited boat storage, and it is not guaranteed that we will be able to store boats we find on Land Bank properties for retrieval. Please enjoy your water recreation and remember to properly store your boat during the off season.</p>',
  },
  {
    question: 'How can I make a donation?',
    category: 'general-faqs',
    html: `<p>Thank you for your support! Donations can be made by check to Nantucket Land Bank, 22 Broad St, Nantucket, MA 02554. If you have any questions please email ${mail('administrator@nantucketlandbank.org')} or call (508) 228-7240. A charitable contribution to the Nantucket Islands Land Bank is deductible under IRC section 170(a)1).</p>`,
  },
  {
    question: 'Why is the Land Bank undertaking climate resilience projects?',
    category: 'general-faqs',
    html: `<p>Climate change is an all-encompassing issue that has societal, economic, and ecological impacts. As a small island, Nantucket is particularly vulnerable to the effects of climate change. The Land Bank is a significant landowner on Nantucket, and as a result, we are proactively engaged in researching and implementing resiliency solutions. Our waterfront properties and other valuable natural resources such as wetlands, salt marshes, and dunes make the Land Bank uniquely positioned to help manage and adapt to these climate-induced challenges through nature-based solutions and hybrid green/gray infrastructure projects. <a href="${OLD}/conservation/climate-resilience/">Click here to learn more about why the Land Bank is undertaking climate resilience projects.</a></p>`,
  },
  {
    question: 'Why does the Land Bank burn and mow its properties?',
    category: 'general-faqs',
    html: `<p>We maintain early successional habitats with disturbance methods including routine mowing, occasional tree removal, and when weather permits, prescribed fire. If we did not maintain these unique ecosystems in this way, we would experience loss of habitat for rare species that call Nantucket home. <a href="${OLD}/mission/conservation/habitat-management/">Click here to learn more about the Land Bank’s habitat management processes!</a></p>`,
  },
]

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const baseId = (id: string) => id.replace(/^drafts\./, '')

type Row = {_id: string; question?: string; orderRank?: string; answer?: unknown[]} & Record<string, unknown>

async function main() {
  const rows = await client.fetch<Row[]>(`*[_type == "faq"]`)
  const byBase = new Map<string, {published?: Row; draft?: Row}>()
  for (const row of rows) {
    const entry = byBase.get(baseId(row._id)) ?? {}
    if (row._id.startsWith('drafts.')) entry.draft = row
    else entry.published = row
    byBase.set(baseId(row._id), entry)
  }
  const byQuestion = new Map<string, string>()
  for (const [id, entry] of byBase) {
    const question = (entry.draft ?? entry.published)?.question
    if (question) byQuestion.set(normalize(question), id)
  }

  const categories = await client.fetch<Array<{_id: string; slug: string}>>(
    `*[_type == "faqCategory"]{_id, "slug": slug.current}`,
  )
  const categoryId = new Map(categories.map((c) => [c.slug, baseId(c._id)]))
  const missingCategory = [...new Set(SOURCE.map((s) => s.category))].filter((slug) => !categoryId.has(slug))
  if (missingCategory.length) {
    console.error(`Missing FAQ categories: ${missingCategory.join(', ')}. Nothing was written.`)
    process.exit(1)
  }

  let rank = rows
    .map((r) => r.orderRank)
    .filter((r): r is string => Boolean(r))
    .sort()
    .pop()
  const nextRank = () => {
    rank = rank ? LexoRank.parse(rank).genNext().toString() : LexoRank.middle().toString()
    return rank
  }

  const counts = {created: 0, filled: 0, kept: 0}
  const oldSiteLinks: string[] = []

  for (const [index, source] of SOURCE.entries()) {
    const {blocks, issues} = htmlToBlocks(source.html, `oldsite-${index + 1}`)
    issues.forEach((issue) => console.log(`  ! ${source.question}: ${issue}`))
    if (blocks.length === 0) throw new Error(`No answer converted for: ${source.question}`)
    blocks.forEach((block: PortableTextBlock) =>
      block.markDefs.filter((def) => def.href.startsWith(OLD)).forEach((def) => oldSiteLinks.push(def.href)),
    )

    const id = byQuestion.get(normalize(source.question))
    const entry = id ? byBase.get(id) : undefined
    if (id && entry) {
      const effective = (entry.draft ?? entry.published)!
      if ((effective.answer?.length ?? 0) > 0) {
        console.log(`  = has an answer, left alone: ${source.question}`)
        counts.kept++
        continue
      }
      console.log(`  ${DRY_RUN ? '[dry run] would fill' : '~ filled'} the answer (draft): ${source.question}`)
      counts.filled++
      if (DRY_RUN) continue
      if (entry.draft) {
        await client.patch(entry.draft._id).set({answer: blocks}).commit()
      } else {
        const {_rev, _createdAt, _updatedAt, ...copy} = entry.published!
        void _rev, void _createdAt, void _updatedAt
        await client.createIfNotExists({...copy, _id: `drafts.${id}`, answer: blocks} as never)
      }
      continue
    }

    console.log(`  ${DRY_RUN ? '[dry run] would create' : '+ created'} draft in ${source.category}: ${source.question}`)
    counts.created++
    if (DRY_RUN) continue
    await client.create({
      _id: 'drafts.',
      _type: 'faq',
      question: source.question,
      answer: blocks,
      orderRank: nextRank(),
      category: {
        _type: 'reference',
        _ref: categoryId.get(source.category)!,
        _weak: true,
        _strengthenOnPublish: {type: 'faqCategory'},
      },
    } as never)
  }

  console.log(
    `${DRY_RUN ? '[dry run] ' : ''}${counts.created} created, ${counts.filled} answers filled, ${counts.kept} left alone.`,
  )
  if (oldSiteLinks.length) {
    console.log(`${oldSiteLinks.length} link(s) point at old-site pages and need a redirect or new target (#76):`)
    ;[...new Set(oldSiteLinks)].forEach((href) => console.log(`    ${href}`))
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
