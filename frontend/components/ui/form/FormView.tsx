import {stegaClean} from 'next-sanity'

import type {FormContent} from '@/sanity/lib/types'
import {allFields} from '@/sanity/lib/forms'

import FormRenderer from './FormRenderer'

/**
 * The boundary between page content and the interactive form. A form reference can always be
 * missing or unpublished, and a form can be saved with nothing in it, so this renders nothing in
 * those cases rather than an empty shell. In Presentation the fetched form carries stega encoding,
 * which would corrupt field keys, widths, options and show-if rules, so it is cleaned first. The
 * optional wrapper is rendered only when there is a form, so a missing form leaves no gap.
 */
export default function FormView({
  form,
  className,
}: {
  form: FormContent | null | undefined
  className?: string
}) {
  if (!form?._id || allFields(form).length === 0) return null
  return (
    <div className={className}>
      <FormRenderer form={stegaClean(form)} />
    </div>
  )
}
