import {useEffect, useState} from 'react'
import {useClient} from 'sanity'

/**
 * Loads the identifiers available in the uploaded boundary file, for any Studio input that needs
 * to offer them. Shared by every boundary picker so the fetch-and-index logic exists once.
 */

const SETTINGS_QUERY = `*[_type == "projectSettings" && _id == "projectSettings"][0]{
  "url": boundaryData.asset->url,
  "idProperty": coalesce(boundaryIdProperty, "id")
}`

/** Feature property names tried, in order, for a human-readable label beside the identifier. */
const NAME_KEYS = ['name', 'NAME', 'Name', 'title', 'TITLE', 'label']

export type BoundaryOption = {value: string; label: string}

export type BoundaryOptionsState =
  | {status: 'loading'}
  | {status: 'ready'; options: BoundaryOption[]}
  | {status: 'notice'; message: string}

export function useBoundaryOptions(): BoundaryOptionsState {
  const client = useClient({apiVersion: '2025-09-25'})
  const [state, setState] = useState<BoundaryOptionsState>({status: 'loading'})

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const settings = await client.fetch<{url?: string; idProperty?: string} | null>(
          SETTINGS_QUERY,
        )

        if (!settings?.url) {
          if (!cancelled) {
            setState({
              status: 'notice',
              message:
                'No boundary data file has been uploaded yet. Add one under Projects → Project Settings, then reopen this project.',
            })
          }
          return
        }

        const idProperty = settings.idProperty || 'id'
        const response = await fetch(settings.url)
        if (!response.ok) {
          throw new Error(`Could not download the boundary file (${response.status}).`)
        }
        const geojson = await response.json()
        const features: unknown[] = Array.isArray(geojson?.features) ? geojson.features : []

        const options: BoundaryOption[] = []
        const seen = new Set<string>()
        for (const feature of features) {
          const featureProps = (feature as {properties?: Record<string, unknown>})?.properties
          const rawId = featureProps?.[idProperty]
          if (rawId === undefined || rawId === null || rawId === '') continue
          const id = String(rawId)
          if (seen.has(id)) continue
          seen.add(id)
          const nameKey = NAME_KEYS.find((key) => typeof featureProps?.[key] === 'string')
          const name = nameKey ? String(featureProps?.[nameKey]) : undefined
          options.push({value: id, label: name ? `${name} — ${id}` : id})
        }

        if (cancelled) return

        if (!options.length) {
          setState({
            status: 'notice',
            message: `The uploaded file has ${features.length} feature(s), but none carry a "${idProperty}" property. Check the Boundary ID property setting under Project Settings.`,
          })
          return
        }

        setState({status: 'ready', options})
      } catch (error) {
        if (cancelled) return
        setState({
          status: 'notice',
          message:
            error instanceof Error ? error.message : 'Could not read the boundary data file.',
        })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [client])

  return state
}
