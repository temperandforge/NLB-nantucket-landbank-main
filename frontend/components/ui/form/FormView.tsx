import type {FormContent} from '@/sanity/lib/types'
import {allFields} from '@/sanity/lib/forms'

import FormRenderer from './FormRenderer'

/**
 * The boundary between page content and the interactive form. A form reference can always be
 * missing or unpublished, and a form can be saved with nothing in it, so this renders nothing in
 * those cases rather than an empty shell.
 */
export default function FormView({form}: {form: FormContent | null | undefined}) {
  if (!form?._id || allFields(form).length === 0) return null
  return <FormRenderer form={form} />
}
