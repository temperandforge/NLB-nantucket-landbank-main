/**
 * Checks a form's field names and show-if rules. One implementation, used by the Studio
 * validation on the `formField` type and by scripts/verifyForms.ts, so the two cannot drift.
 * It cannot import from the frontend (separate package), so the choice types are restated here.
 */

const CHOICE_TYPES = ['select', 'multiSelect', 'checkboxGroup', 'radioGroup']

export type RuleField = {
  _key: string
  name?: {current?: string}
  fieldType?: string
  options?: string[]
  showIf?: {field?: string; equals?: string}
}

export type RuleForm = {sections?: {fields?: RuleField[]}[]}

export type FieldProblem = {fieldKey: string; path: 'name' | 'showIf'; message: string}

/** The `_key` of the field a validation path points into (the last keyed segment). */
export function fieldKeyFromPath(path: unknown[]): string | undefined {
  const keyed = path.filter(
    (segment): segment is {_key: string} =>
      typeof segment === 'object' && segment !== null && '_key' in segment,
  )
  return keyed.length >= 2 ? keyed[keyed.length - 1]._key : undefined
}

export function findFormProblems(form: RuleForm): FieldProblem[] {
  const fields = (form.sections ?? []).flatMap((section) => section.fields ?? [])
  const problems: FieldProblem[] = []
  const seen = new Map<string, number>()

  fields.forEach((field, index) => {
    const name = field.name?.current
    if (name && !/^[a-z0-9][a-z0-9_-]*$/.test(name)) {
      problems.push({
        fieldKey: field._key,
        path: 'name',
        message: `The key "${name}" may only use lowercase letters, numbers, hyphens and underscores (it is used in element ids and stored answers)`,
      })
    }
    if (name) {
      if (seen.has(name)) {
        problems.push({
          fieldKey: field._key,
          path: 'name',
          message: `The key "${name}" is already used by another field in this form`,
        })
      } else {
        seen.set(name, index)
      }
    }

    const rule = field.showIf
    if (!rule?.field && !rule?.equals) return
    const target = rule.field ? fields.findIndex((other) => other.name?.current === rule.field) : -1
    if (!rule.field || target === -1) {
      problems.push({
        fieldKey: field._key,
        path: 'showIf',
        message: 'Show-if must name a field in this form',
      })
    } else if (target >= index) {
      problems.push({
        fieldKey: field._key,
        path: 'showIf',
        message: 'Show-if must refer to a field that comes earlier in the form',
      })
    } else if (!CHOICE_TYPES.includes(fields[target].fieldType ?? '')) {
      problems.push({
        fieldKey: field._key,
        path: 'showIf',
        message: 'Show-if can only depend on a dropdown, multi-select, checkbox group or radio group',
      })
    } else if (!rule.equals || !(fields[target].options ?? []).includes(rule.equals)) {
      problems.push({
        fieldKey: field._key,
        path: 'showIf',
        message: `"${rule.equals ?? ''}" is not one of the options of the field it depends on`,
      })
    }
  })
  return problems
}
