/**
 * Verifies the form contracts that depend on document data, against the real dataset.
 *
 *   npx sanity exec scripts/verifyForms.ts --with-user-token
 *
 * Checks, with the same rules Studio uses (src/lib/formRules.ts): every form's field keys are
 * unique and every show-if names an earlier choice field and one of its options; and every form
 * a page references (a Contact Form block or an embedded form) exists as a published document.
 * Read-only. Exits non-zero on the first failure.
 */

import {getCliClient} from 'sanity/cli'

import {findFormProblems, type RuleForm} from '../src/lib/formRules'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const failures: string[] = []
function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failures.push(message)
  }
}

async function main() {
  const forms = await client.fetch<(RuleForm & {_id: string; title?: string})[]>(
    `*[_type == "form"]{_id, title, sections[]{fields[]{_key, name, fieldType, options, showIf}}}`,
  )
  console.log(`${forms.length} form document(s)`)
  for (const form of forms) {
    const problems = findFormProblems(form)
    check(problems.length === 0, `${form.title ?? form._id}: ${problems.map((p) => p.message).join('; ') || 'rules ok'}`)
  }

  // Only published pages reach visitors, so only their references matter.
  const refs = await client.fetch<{page: string; ids: string[]}[]>(
    `*[_type == "page" && !(_id in path("drafts.**"))]{
      "page": coalesce(title, _id),
      "ids": array::compact([
        ...pageBuilder[_type == "contactForm"].form._ref,
        ...pageBuilder[_type == "basicLeftRightText"].rightContent[_type == "formEmbed"].form._ref
      ])
    }[count(ids) > 0]`,
  )
  for (const {page, ids} of refs) {
    for (const id of ids) {
      const found = await client.fetch<number>(`count(*[_id == $id && _type == "form"])`, {id})
      check(found > 0, `${page}: form ${id} is published`)
    }
  }
  if (refs.length === 0) console.log('  (no published page uses a form yet)')

  process.exit(failures.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
