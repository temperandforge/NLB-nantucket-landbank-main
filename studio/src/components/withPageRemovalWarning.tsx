import {useState} from 'react'
import {useClient, type DocumentActionComponent} from 'sanity'

import {describeRemovalImpact} from '../lib/pageUrlImpact'

/**
 * Wraps a page's Unpublish or Delete action so the editor sees what it will break first: the
 * page's URL, the pages below it, and the redirects that point at it. When nothing depends on the
 * page the original action runs straight away. The original's own confirmation (Delete has one)
 * still follows. A failed lookup never blocks the action.
 */
export function withPageRemovalWarning(original: DocumentActionComponent): DocumentActionComponent {
  const Wrapped: DocumentActionComponent = (props) => {
    const result = original(props)
    const client = useClient({apiVersion: '2025-09-25'})
    const [message, setMessage] = useState<string | null>(null)

    if (!result) return result
    const proceed = () => {
      setMessage(null)
      result.onHandle?.()
    }

    return {
      ...result,
      onHandle: async () => {
        let impact: string | null = null
        try {
          impact = await describeRemovalImpact(client, props.id)
        } catch {
          impact = null
        }
        if (impact) setMessage(impact)
        else result.onHandle?.()
      },
      dialog: message
        ? {
            type: 'confirm',
            tone: 'caution',
            message,
            confirmButtonText: result.label ?? 'Continue',
            onConfirm: proceed,
            onCancel: () => setMessage(null),
          }
        : result.dialog,
    }
  }
  Wrapped.action = original.action
  Wrapped.displayName = `withPageRemovalWarning(${original.displayName ?? original.action ?? 'action'})`
  return Wrapped
}
