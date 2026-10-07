/**
 * Verifies the form logic shared by the browser form and the submit route. There is no test
 * framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyFormLogic.mts
 *
 * Imports the real modules, not copies. Exits non-zero on failure.
 */
import {
  allFields,
  answerRows,
  validateField,
  validateForm,
  visibleFields,
  type FormFieldLike,
  type FormLike,
  type Values,
} from '../sanity/lib/forms.ts'
import {moveActive, typeaheadMatch} from '../sanity/lib/listbox.ts'
import {
  isRateLimited,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  resetRateLimit,
} from '../sanity/lib/formRateLimit.ts'

let failed = false
function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failed = true
  }
}

const field = (f: Partial<FormFieldLike> & {name: string; fieldType: string}): FormFieldLike => ({
  _key: f.name,
  label: f.name,
  ...f,
})

const form: FormLike = {
  sections: [
    {
      fields: [
        field({name: 'first', fieldType: 'text', label: 'First name', required: true}),
        field({name: 'email', fieldType: 'email', required: true}),
        field({name: 'phone', fieldType: 'phone'}),
        field({name: 'qty', fieldType: 'number'}),
        field({name: 'day', fieldType: 'date'}),
        field({name: 'at', fieldType: 'time'}),
        field({name: 'topic', fieldType: 'select', required: true, options: ['A', 'B']}),
        field({
          name: 'catering',
          fieldType: 'radioGroup',
          required: true,
          options: ['Yes', 'No'],
        }),
        field({
          name: 'caterer',
          fieldType: 'text',
          required: true,
          showIf: {field: 'catering', equals: 'Yes'},
        }),
        field({
          name: 'caterer-phone',
          fieldType: 'phone',
          required: true,
          showIf: {field: 'caterer', equals: 'x'},
        }),
        field({name: 'extras', fieldType: 'multiSelect', options: ['One', 'Two', 'Three']}),
        field({name: 'msg', fieldType: 'textarea', maxLength: 10}),
      ],
    },
  ],
}

const base: Values = {first: 'Jane', email: 'jane@example.com', topic: 'A', catering: 'No'}

console.log('validateField')
const text = field({name: 'x', fieldType: 'text', label: 'X', required: true})
check(validateField(text, undefined) === 'X is required', 'required, missing -> error')
check(validateField(text, '   ') === 'X is required', 'required, whitespace only -> error')
check(validateField(text, ' ok ') === null, 'required, value -> ok')
check(validateField(field({name: 'x', fieldType: 'text'}), '') === null, 'optional, empty -> ok')
const email = field({name: 'e', fieldType: 'email', label: 'E'})
check(validateField(email, 'nope') !== null, 'email without @ -> error')
check(validateField(email, 'a@b') !== null, 'email without domain dot -> error')
check(validateField(email, 'jane@example.com') === null, 'email ok')
const phone = field({name: 'p', fieldType: 'phone', label: 'P'})
check(validateField(phone, '12') !== null, 'phone too short -> error')
check(validateField(phone, 'abc-defg-hij') !== null, 'phone with letters -> error')
check(validateField(phone, '(123) 456-7890') === null, 'phone ok')
const num = field({name: 'n', fieldType: 'number', label: 'N'})
check(validateField(num, 'abc') !== null, 'number: letters -> error')
check(validateField(num, '12') === null, 'number ok')
const date = field({name: 'd', fieldType: 'date', label: 'D'})
check(validateField(date, '2026-02-30') !== null, 'date: impossible day -> error')
check(validateField(date, '07/10/2026') !== null, 'date: wrong format -> error')
check(validateField(date, '2026-10-07') === null, 'date ok')
const time = field({name: 't', fieldType: 'time', label: 'T'})
check(validateField(time, '24:00') !== null, 'time: 24:00 -> error')
check(validateField(time, '09:30') === null, 'time ok')
const area = field({name: 'a', fieldType: 'textarea', label: 'A', maxLength: 5})
check(validateField(area, '123456') !== null, 'textarea over maxLength -> error')
check(validateField(area, '12345') === null, 'textarea at maxLength ok')
const sel = field({name: 's', fieldType: 'select', label: 'S', options: ['A', 'B']})
check(validateField(sel, 'C') !== null, 'select: value not offered -> error (tampered)')
check(validateField(sel, ['A']) !== null, 'select: array instead of string -> error')
const multi = field({name: 'm', fieldType: 'multiSelect', label: 'M', options: ['A', 'B']})
check(validateField(multi, ['A', 'C']) !== null, 'multi: unknown option -> error (tampered)')
check(validateField(multi, 'A') !== null, 'multi: string instead of list -> error')
check(validateField(multi, ['A', 'B']) === null, 'multi ok')
check(
  validateField({...multi, required: true}, []) === 'M is required',
  'multi required, empty list -> error',
)

console.log('visibility')
check(
  !visibleFields(form, {...base, catering: 'No'}).some((f) => f.name === 'caterer'),
  'caterer hidden when catering is No',
)
check(
  !visibleFields(form, base).some((f) => f.name === 'caterer'),
  'caterer hidden when catering is unanswered',
)
check(
  visibleFields(form, {...base, catering: 'Yes'}).some((f) => f.name === 'caterer'),
  'caterer shown when catering is Yes',
)
check(
  !visibleFields(form, {...base, catering: 'No', caterer: 'x'}).some(
    (f) => f.name === 'caterer-phone',
  ),
  'a field controlled by a hidden field is hidden even if the stale value matches',
)
check(
  visibleFields(form, {...base, catering: 'Yes', caterer: 'x'}).some(
    (f) => f.name === 'caterer-phone',
  ),
  'chained field shown when the whole chain matches',
)

console.log('validateForm')
{
  const {errors, clean} = validateForm(form, base)
  check(Object.keys(errors).length === 0, 'valid form, hidden required fields do not block')
  check(clean.first === 'Jane' && clean.topic === 'A', 'clean keeps answered values')
}
{
  const {errors} = validateForm(form, {...base, catering: 'Yes'})
  check(errors.caterer === 'caterer is required', 'a shown required field is enforced')
}
{
  const {clean} = validateForm(form, {...base, catering: 'No', caterer: 'Stale Caterer'})
  check(!('caterer' in clean), 'a stale value from a now-hidden field is dropped')
}
{
  const {clean} = validateForm(form, {...base, zzz: 'unknown', extras: []})
  check(!('zzz' in clean), 'unknown keys are dropped')
  check(!('extras' in clean), 'an empty optional list is not stored')
}
{
  const {clean} = validateForm(form, {...base, first: '  Jane  '})
  check(clean.first === 'Jane', 'string values are trimmed')
}
{
  const risky: FormLike = {
    sections: [
      {fields: [field({name: 'constructor', fieldType: 'text', label: 'C', required: true})]},
    ],
  }
  const {errors} = validateForm(risky, {})
  check(Object.hasOwn(errors, 'constructor'), 'a field named like an Object.prototype key is read as own data')
  const polluted = JSON.parse('{"__proto__": {"x": "y"}, "constructor": "ok"}') as Values
  const result = validateForm(risky, polluted)
  check(Object.keys(result.errors).length === 0, 'a JSON __proto__ key does not break validation')
  check(({} as Record<string, unknown>).x === undefined, 'Object.prototype is not polluted')
}
{
  const malformed: FormLike = {
    sections: [
      {fields: [{_key: 'a'}, {_key: 'b', name: 'b'}, null as unknown as FormFieldLike]},
      {fields: null},
    ],
  }
  check(allFields(malformed).length === 0, 'fields missing name, label or type are skipped')
  check(
    validateForm({sections: null}, {}).errors !== undefined,
    'a form with no sections validates without throwing',
  )
}

console.log('answerRows')
{
  const {clean} = validateForm(form, {...base, extras: ['One', 'Three'], msg: 'hi'})
  const rows = answerRows(form, clean)
  check(rows[0].name === 'first' && rows[0].label === 'First name', 'rows follow field order')
  const extras = rows.find((r) => r.name === 'extras')
  check(extras?.value === 'One, Three', 'a list is stored as its labels joined with ", "')
  check(rows.every((r) => typeof r.value === 'string' && r._key === r.name), 'rows are strings with a key')
}

console.log('listbox')
check(moveActive(-1, 3, 'ArrowDown') === 0, 'ArrowDown from nothing -> first')
check(moveActive(2, 3, 'ArrowDown') === 2, 'ArrowDown at the end stays')
check(moveActive(-1, 3, 'ArrowUp') === 2, 'ArrowUp from nothing -> last')
check(moveActive(0, 3, 'ArrowUp') === 0, 'ArrowUp at the start stays')
check(moveActive(1, 3, 'Home') === 0 && moveActive(1, 3, 'End') === 2, 'Home and End')
check(moveActive(1, 0, 'ArrowDown') === -1, 'an empty list has no active option')
check(moveActive(1, 3, 'x') === 1, 'other keys leave the active option')
const names = ['Apple', 'Avocado', 'Banana']
check(typeaheadMatch(names, 'a', 0) === 1, 'one letter cycles to the next match')
check(typeaheadMatch(names, 'a', 1) === 0, 'one letter wraps around')
check(typeaheadMatch(names, 'ban', -1) === 2, 'a prefix finds its option')
check(typeaheadMatch(names, 'x', 0) === -1, 'no match -> -1')
check(typeaheadMatch(names, '', 0) === -1, 'an empty buffer -> -1')

console.log('rate limit')
{
  resetRateLimit()
  const t0 = 1_000_000
  const results = Array.from({length: RATE_LIMIT_MAX + 1}, (_, i) => isRateLimited('ip-a', t0 + i))
  check(results.slice(0, RATE_LIMIT_MAX).every((r) => r === false), 'the first attempts are allowed')
  check(results[RATE_LIMIT_MAX] === true, 'the next attempt is blocked')
  check(isRateLimited('ip-b', t0) === false, 'another key is independent')
  check(
    isRateLimited('ip-a', t0 + RATE_LIMIT_WINDOW_MS + RATE_LIMIT_MAX + 1) === false,
    'allowed again once the window has passed',
  )
}

process.exit(failed ? 1 : 0)
