/**
 * Migrates the document lists on three WordPress pages to DRAFT `record` documents, one per PDF:
 *   https://www.nantucketlandbank.org/about/meeting-minutes/  -> category `meeting-minutes`  (19)
 *   https://www.nantucketlandbank.org/about/annual-reports/   -> category `annual-reports`   (42)
 *   https://www.nantucketlandbank.org/about/agendas/          -> category `meeting-agendas`  (19)
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importWordpressRecords.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importWordpressRecords.ts --with-user-token
 *
 * What it writes: draft `record` documents (Sanity generates the ids) and one file asset per record,
 * downloaded from the live site. Nothing else is touched; the "[Sample]" records are left alone.
 *
 * Idempotent and non-destructive: a record in the same category whose title matches (ignoring a
 * trailing " (PDF)"), published or draft, is skipped and NEVER edited. --dry prints the plan and
 * checks every PDF resolves, but writes and uploads nothing. Every PDF is checked before the first
 * write, and each category must already exist and be published; otherwise nothing is written.
 *
 * Decisions:
 *  - title: the link text on the WordPress page without its trailing "(PDF)", with the source's typos
 *    fixed ("April; 28", "May 26, 26", "March 24.,", "Documents(PDF)", and the agenda link split into
 *    "S" + "eptember 8").
 *  - date: minutes and agendas are dated by the meeting date in the title, because those categories
 *    sort newest-first and filter by year. Annual reports have only a year, so each gets January 1 of
 *    that year as a sort key; it is not a publication date.
 *  - not migrated: the agendas page's closing text (links to the Town's Agenda Center and to /contact/,
 *    neither a file) and its "Policy Regarding Agenda Procedures (PDF)" link, which is a policy and is
 *    covered by the "Meeting Agenda Procedures Policy" record from importWordpressPolicies.ts.
 *  - not migrated: older years, which WordPress keeps on sub-pages (2025 minutes; 2021-2025 agendas).
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')
const UPLOADS = 'https://www.nantucketlandbank.org/wp-content/uploads'

type Entry = {title: string; filename: string; date: string}
type Batch = {slug: string; entries: Entry[]}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "2026-10-01" -> "October 1, 2026" */
function longDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return `${MONTHS[month - 1]} ${day}, ${year}`
}

// [date, filename, title suffix after the date]
const MINUTES: Array<[string, string, string?]> = [
  ['2026-10-01', 'Minutes-10.1.26-Special-Mtg.pdf', 'Special Meeting Minutes'],
  ['2026-09-22', 'Minutes-9.22.26.pdf'],
  ['2026-09-08', 'Minutes-9.8.26.pdf'],
  ['2026-08-25', 'Minutes-8.25.26.pdf'],
  ['2026-08-11', 'Minutes-8.11.26.pdf'],
  ['2026-07-28', 'Minutes-7.28.26.pdf'],
  ['2026-07-14', 'Minutes-7.14.26.pdf'],
  ['2026-06-23', 'Minutes-6.23.26.pdf'],
  ['2026-06-09', 'Minutes-6.9.26.pdf'],
  ['2026-05-26', 'Minutes-5.26.26.pdf'],
  ['2026-05-12', 'Minutes-5.12.26.pdf'],
  ['2026-04-28', 'Minutes-4.28.26.pdf'],
  ['2026-04-14', 'Minutes-4.14.26.pdf'],
  ['2026-04-09', 'Minutes-4.9.26-Special-Mtg.pdf', 'Site Visit Meeting Minutes'],
  ['2026-03-24', 'Minutes-3.24.26.pdf'],
  ['2026-03-10', 'Minutes-3.10.26.pdf'],
  ['2026-02-10', 'Minutes-2.10.26.pdf'],
  ['2026-01-27', 'Minutes-1.27.26.pdf'],
  ['2026-01-13', 'Minutes-1.13.26.pdf'],
]

const AGENDAS: Array<[string, string]> = [
  ['2026-10-27', 'MEETING-PACKET-FOR-WEBSITE-20.pdf'],
  ['2026-10-13', 'MEETING-PACKET-FOR-Website-1.pdf'],
  ['2026-09-22', 'MEETING-PACKET-FOR-WEBSITE-19.pdf'],
  ['2026-09-08', 'MEETING-PACKET-FOR-COMMISSION-2.pdf'],
  ['2026-08-25', 'MEETING-PACKET-FOR-WEBSITE-18.pdf'],
  ['2026-08-11', 'MEETING-PACKET-FOR-WEBSITE-17.pdf'],
  ['2026-07-28', 'MEETING-PACKET-FOR-WEBSITE-16.pdf'],
  ['2026-07-14', 'MEETING-PACKET-FOR-COMMISSION-1.pdf'],
  ['2026-06-23', 'MEETING-PACKET-FOR-WEBSITE-15.pdf'],
  ['2026-06-09', 'Meeting-Packet-for-Website-25.pdf'],
  ['2026-05-26', 'MEETING-PACKET-FOR-WEBSITE-12.pdf'],
  ['2026-05-12', 'MEETING-PACKET-FOR-WEBSITE-14.pdf'],
  ['2026-04-28', 'REVISED-MEETING-PACKET-FOR-WEBSITE.pdf'],
  ['2026-04-14', 'MEETING-PACKET-FOR-WEBSITErevised.pdf'],
  ['2026-03-24', 'MEETING-DOCUMENTS-FOR-WEBSITE.pdf'],
  ['2026-03-10', 'MEETING-PACKET-FOR-WEBSITE-11.pdf'],
  ['2026-02-10', 'MEETING-PACKET-FOR-COMMISSIONERS-2.pdf'],
  ['2026-01-27', 'MEETING-PACKET-FOR-WEBSITE-10.pdf'],
  ['2026-01-13', 'MEETING-PACKET-FOR-COMMISSIONERS-1.pdf'],
]

// [year, filename], newest first, exactly as the page lists them.
const ANNUAL_REPORTS: Array<[number, string]> = [
  [2025, 'Annual-Report-FY25-Final.pdf'],
  [2024, 'Land-Bank-FY24-Annual-Report-FINAL.pdf'],
  [2023, '2023-Annual-Report-PDF.pdf'],
  [2022, 'Land-Bank-FY22-Annual-Report-FINAL.pdf'],
  [2021, 'Land-Bank-FY21-Annual-Report.pdf'],
  [2020, 'Land-Bank-FY20-Annual-Report-1.pdf'],
  [2019, 'Land-Bank-FY19-Annual-Report.pdf'],
  [2018, 'Land-Bank-FY18-Annual-Report.pdf'],
  [2017, 'LandBank_Final_FY17.pdf'],
  [2016, 'Annual-Report-2016.pdf'],
  [2015, 'AnnualReport2015.pdf'],
  [2014, 'AnnualReport2014ES-Final.pdf'],
  [2013, 'AnnualReport2013ES-Final.pdf'],
  [2012, 'AnnualReportFY12.pdf'],
  [2011, 'AnnualReportFY11.pdf'],
  [2010, 'AnnualReportFY10-FullVersion.pdf'],
  [2009, 'AnnualReport2009.pdf'],
  [2008, 'AnnualReportFY08.pdf'],
  [2007, 'AnnualReportFY07.pdf'],
  ...Array.from({length: 2006 - 1984 + 1}, (_, i): [number, string] => {
    const year = 2006 - i
    return [year, `${year}-Annual-Report-PDF.pdf`]
  }),
]

const BATCHES: Batch[] = [
  {
    slug: 'meeting-minutes',
    entries: MINUTES.map(([date, filename, suffix]) => ({
      title: `${longDate(date)} ${suffix ?? 'Meeting Minutes'}`,
      filename,
      date,
    })),
  },
  {
    slug: 'annual-reports',
    entries: ANNUAL_REPORTS.map(([year, filename]) => ({
      title: `${year} Annual Report`,
      filename,
      date: `${year}-01-01`,
    })),
  },
  {
    slug: 'meeting-agendas',
    entries: AGENDAS.map(([date, filename]) => ({
      title: `${longDate(date)} Agenda and Meeting Documents`,
      filename,
      date,
    })),
  },
]

const normalize = (title: string | null) => (title ?? '').replace(/\s*\(PDF\)\s*$/, '').trim()

async function main() {
  // Resolve every category and every PDF before writing anything.
  const categories = new Map<string, string>()
  for (const batch of BATCHES) {
    const category = await client.fetch<{_id: string} | null>(
      `*[_type == "recordCategory" && slug.current == $slug && !(_id in path("drafts.**"))][0]{_id}`,
      {slug: batch.slug},
    )
    if (!category) throw new Error(`No published recordCategory with slug "${batch.slug}"; nothing written.`)
    categories.set(batch.slug, category._id)
  }

  const filenames = new Set<string>()
  const duplicates = new Set<string>()
  for (const batch of BATCHES) {
    for (const entry of batch.entries) {
      if (filenames.has(entry.filename)) duplicates.add(entry.filename)
      filenames.add(entry.filename)
    }
  }
  if (duplicates.size > 0) throw new Error(`Duplicate files in the plan: ${[...duplicates].join(', ')}`)

  const missing: string[] = []
  for (const filename of filenames) {
    const response = await fetch(`${UPLOADS}/${filename}`, {method: 'HEAD'})
    if (!response.ok) missing.push(`${filename} (${response.status})`)
  }
  if (missing.length > 0) throw new Error(`These files do not resolve; nothing written:\n  ${missing.join('\n  ')}`)

  let created = 0
  let skipped = 0
  for (const batch of BATCHES) {
    const categoryId = categories.get(batch.slug)!
    const existing = await client.fetch<Array<{title: string | null}>>(
      `*[_type == "record" && (category._ref == $id || category._ref == $draftId)]{title}`,
      {id: categoryId, draftId: `drafts.${categoryId}`},
    )
    const have = new Set(existing.map((record) => normalize(record.title)))
    console.log(`\n${batch.slug}: ${batch.entries.length} on the page, ${existing.length} already in Sanity`)

    for (const entry of batch.entries) {
      if (have.has(entry.title)) {
        console.log(`  = exists, left as is: ${entry.title}`)
        skipped++
        continue
      }
      console.log(`  + ${DRY_RUN ? 'would create' : 'creating'}: ${entry.title} (${entry.date}) <- ${entry.filename}`)
      if (DRY_RUN) continue

      const response = await fetch(`${UPLOADS}/${entry.filename}`)
      if (!response.ok) throw new Error(`Could not download ${entry.filename}: ${response.status}`)
      const asset = await client.assets.upload('file', Buffer.from(await response.arrayBuffer()), {
        filename: entry.filename,
        contentType: 'application/pdf',
      })
      await client.create({
        _id: 'drafts.',
        _type: 'record',
        title: entry.title,
        date: entry.date,
        file: {_type: 'file', asset: {_type: 'reference', _ref: asset._id}},
        category: {_type: 'reference', _ref: categoryId},
      } as never)
      created++
    }
  }
  console.log(DRY_RUN ? `\n[dry run] nothing downloaded or written (${skipped} would be skipped).` : `\nDone: ${created} created, ${skipped} skipped.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
