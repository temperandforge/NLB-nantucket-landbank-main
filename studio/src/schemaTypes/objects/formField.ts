import {defineField, defineType} from 'sanity'

import {fieldKeyFromPath, findFormProblems, type RuleForm} from '../../lib/formRules'

const FIELD_TYPES = [
  {title: 'Text', value: 'text'},
  {title: 'Email', value: 'email'},
  {title: 'Phone', value: 'phone'},
  {title: 'Number', value: 'number'},
  {title: 'Text area', value: 'textarea'},
  {title: 'Dropdown (choose one)', value: 'select'},
  {title: 'Multi-select dropdown', value: 'multiSelect'},
  {title: 'Date', value: 'date'},
  {title: 'Time', value: 'time'},
  {title: 'Checkboxes (choose any)', value: 'checkboxGroup'},
  {title: 'Radio buttons (choose one)', value: 'radioGroup'},
]
const CHOICE = ['select', 'multiSelect', 'checkboxGroup', 'radioGroup']
const NO_PLACEHOLDER = ['date', 'time', 'checkboxGroup', 'radioGroup']

type Parent = {fieldType?: string}

/** A rule's message for this field, from the shared checker. */
const problemFor = (path: 'name' | 'showIf') => (_value: unknown, context: {document?: unknown; path?: unknown[]}) => {
  const key = fieldKeyFromPath(context.path ?? [])
  if (!key) return true
  const problem = findFormProblems((context.document ?? {}) as RuleForm).find(
    (p) => p.fieldKey === key && p.path === path,
  )
  return problem ? problem.message : true
}

/**
 * One question on a form. A single type with a field-type list rather than one type per kind: the
 * kinds share almost everything, and the extras appear only where they apply. Choice answers are
 * stored as the option text, so there is no separate value to keep in step with the label.
 */
export const formField = defineType({
  name: 'formField',
  title: 'Form field',
  type: 'object',
  fields: [
    defineField({
      name: 'fieldType',
      title: 'Field type',
      type: 'string',
      options: {list: FIELD_TYPES},
      initialValue: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'The question shown above the field. The required asterisk is added for you.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'name',
      title: 'Key',
      type: 'slug',
      description:
        'Identifies this field on stored submissions. Filled by the Generate button from the label, and must be generated before publishing. Leave it alone once the form is live, because changing it detaches earlier answers.',
      options: {
        source: (_doc, {parent}) => (parent as {label?: string})?.label ?? '',
        isUnique: () => true,
      },
      validation: (rule) => rule.required().custom(problemFor('name')),
    }),
    defineField({name: 'helperText', title: 'Helper text', type: 'string'}),
    defineField({
      name: 'placeholder',
      title: 'Placeholder',
      type: 'string',
      hidden: ({parent}) => NO_PLACEHOLDER.includes((parent as Parent)?.fieldType ?? ''),
    }),
    defineField({
      name: 'options',
      title: 'Options',
      type: 'array',
      of: [{type: 'string'}],
      description: 'What the visitor can choose from. The chosen text is what is stored.',
      hidden: ({parent}) => !CHOICE.includes((parent as Parent)?.fieldType ?? ''),
      validation: (rule) =>
        rule.custom((value, context) => {
          const type = (context.parent as Parent)?.fieldType ?? ''
          if (!CHOICE.includes(type)) return true
          return Array.isArray(value) && value.length > 0 ? true : 'Add at least one option'
        }),
    }),
    defineField({
      name: 'maxLength',
      title: 'Maximum length',
      type: 'number',
      description: 'Shows a character counter under the field.',
      hidden: ({parent}) => (parent as Parent)?.fieldType !== 'textarea',
      validation: (rule) => rule.integer().min(1),
    }),
    defineField({name: 'required', title: 'Required', type: 'boolean', initialValue: false}),
    defineField({
      name: 'width',
      title: 'Width',
      type: 'string',
      description: 'Half fills one column of a two-column section; it has no effect in a one-column section.',
      options: {
        list: [
          {title: 'Full', value: 'full'},
          {title: 'Half', value: 'half'},
        ],
        layout: 'radio',
      },
      initialValue: 'full',
    }),
    defineField({
      name: 'showIf',
      title: 'Show only if',
      type: 'object',
      description:
        'Show this field only when an earlier dropdown, checkbox or radio field has a certain answer. The field is neither shown nor required otherwise.',
      options: {collapsible: true, collapsed: true},
      fields: [
        defineField({
          name: 'field',
          title: 'Key of the earlier field',
          type: 'string',
          description: 'The Key (not the label) of the field this depends on.',
        }),
        defineField({
          name: 'equals',
          title: 'Has the answer',
          type: 'string',
          description: 'Must match one of that field’s options exactly.',
        }),
      ],
      validation: (rule) => rule.custom(problemFor('showIf')),
    }),
  ],
  preview: {
    select: {title: 'label', type: 'fieldType', required: 'required'},
    prepare: ({title, type, required}) => ({
      title: title || 'No label yet',
      subtitle: [FIELD_TYPES.find((t) => t.value === type)?.title ?? type, required && 'required']
        .filter(Boolean)
        .join(' · '),
    }),
  },
})
