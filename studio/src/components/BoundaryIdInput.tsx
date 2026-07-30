import {useEffect, useMemo, useState} from 'react'
import {Autocomplete, Box, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {set, unset, useClient, type StringInputProps} from 'sanity'

/**
 * Picker for a project's boundary in the uploaded map data file.
 *
 * The client uploads one GeoJSON FeatureCollection covering every boundary, and each project
 * points at one feature inside it. Typing that identifier by hand is the obvious failure mode -
 * a typo produces a project that simply never draws on the map, with nothing to indicate why.
 * So this reads the uploaded file, offers the identifiers it actually contains, and says plainly
 * when the stored value is not one of them.
 *
 * Which feature property holds the identifier is configurable (`boundaryIdProperty` on Project
 * Settings) because the client's file does not exist yet and its schema is unknown - hardcoding
 * a guess would break on upload.
 */

const SETTINGS_QUERY = `*[_type == "projectSettings" && _id == "projectSettings"][0]{
  "url": boundaryData.asset->url,
  "idProperty": coalesce(boundaryIdProperty, "id")
}`

/** Feature property names tried, in order, for a human-readable label beside the identifier. */
const NAME_KEYS = ['name', 'NAME', 'Name', 'title', 'TITLE', 'label']

type BoundaryOption = {value: string; label: string}

type LoadState =
  | {status: 'loading'}
  | {status: 'ready'; options: BoundaryOption[]}
  | {status: 'notice'; message: string}

export function BoundaryIdInput(props: StringInputProps) {
  const {value, onChange, elementProps, readOnly} = props
  const client = useClient({apiVersion: '2025-09-25'})
  const [state, setState] = useState<LoadState>({status: 'loading'})

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
          // A duplicated identifier is ambiguous - the map would pick one arbitrarily - so only
          // the first is offered rather than listing the same value twice.
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

  const isOrphaned = useMemo(() => {
    if (!value || state.status !== 'ready') return false
    return !state.options.some((option) => option.value === value)
  }, [value, state])

  if (state.status === 'loading') {
    return (
      <Flex align="center" gap={2} paddingY={2}>
        <Spinner muted />
        <Text size={1} muted>
          Reading boundary data…
        </Text>
      </Flex>
    )
  }

  // Without options there is nothing to pick from, so fall back to showing the stored value and
  // why it cannot be edited here - never silently render an empty control.
  if (state.status === 'notice') {
    return (
      <Stack space={3}>
        <Card padding={3} radius={2} shadow={1} tone="caution">
          <Text size={1}>{state.message}</Text>
        </Card>
        {value ? (
          <Text size={1} muted>
            Current value: <code>{value}</code>
          </Text>
        ) : null}
      </Stack>
    )
  }

  return (
    <Stack space={3}>
      <Autocomplete
        id={elementProps.id}
        ref={elementProps.ref}
        onBlur={elementProps.onBlur}
        onFocus={elementProps.onFocus}
        readOnly={readOnly}
        options={state.options}
        value={value ?? ''}
        placeholder="Search boundaries…"
        openButton
        filterOption={(query, option) =>
          option.label.toLowerCase().includes(query.toLowerCase()) ||
          option.value.toLowerCase().includes(query.toLowerCase())
        }
        renderOption={(option) => (
          <Card as="button" padding={3} radius={2}>
            <Text size={1}>{option.label}</Text>
          </Card>
        )}
        onChange={(nextValue: string | null) => {
          onChange(nextValue ? set(nextValue) : unset())
        }}
      />
      {isOrphaned ? (
        <Card padding={3} radius={2} shadow={1} tone="critical">
          <Text size={1}>
            &ldquo;{value}&rdquo; is not in the uploaded boundary file, so this project will not
            draw on the map. Pick one of the {state.options.length} available boundaries.
          </Text>
        </Card>
      ) : (
        <Box>
          <Text size={1} muted>
            {state.options.length} boundaries available.
          </Text>
        </Box>
      )}
    </Stack>
  )
}
