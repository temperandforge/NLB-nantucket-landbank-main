import {useEffect, useMemo, useState} from 'react'
import {AddIcon, TrashIcon} from '@sanity/icons'
import {Autocomplete, Box, Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {set, unset, useClient, useFormValue, type ArrayOfPrimitivesInputProps} from 'sanity'

/**
 * Picker for a project's boundaries in the uploaded map data file - a project may span more than
 * one feature, so this is a repeatable list of the same per-row search/validation experience
 * BoundaryIdInput used to provide for a single value.
 *
 * Which feature property holds the identifier is configurable (`boundaryIdProperty` on Project
 * Settings) because the client's file schema is not ours to assume.
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

export function BoundaryIdsInput(props: ArrayOfPrimitivesInputProps) {
  const {value, onChange, readOnly} = props
  const client = useClient({apiVersion: '2025-09-25'})
  const documentId = useFormValue(['_id']) as string | undefined
  const [state, setState] = useState<LoadState>({status: 'loading'})
  const [otherOwners, setOtherOwners] = useState<Map<string, string[]>>(new Map())

  // The schema constrains this field to an array of strings; the wider default generic on
  // ArrayOfPrimitivesInputProps is what the `components.input` slot expects, so normalize here.
  const boundaryIds = useMemo(() => (value ?? []).map(String), [value])

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

  useEffect(() => {
    let cancelled = false
    const currentId = (documentId ?? '').replace(/^drafts\./, '')

    async function loadOtherOwners() {
      if (!currentId) return
      const others = await client.fetch<{name: string; boundaryIds: string[] | null}[]>(
        `*[_type == "project" && !(_id in [$id, "drafts." + $id])]{name, boundaryIds}`,
        {id: currentId},
      )
      if (cancelled) return
      const owners = new Map<string, string[]>()
      for (const other of others) {
        for (const id of other.boundaryIds ?? []) {
          const names = owners.get(id) ?? []
          names.push(other.name || 'Untitled')
          owners.set(id, names)
        }
      }
      setOtherOwners(owners)
    }

    loadOtherOwners()
    return () => {
      cancelled = true
    }
  }, [client, documentId])

  const orphanedIds = useMemo(() => {
    if (state.status !== 'ready') return new Set<string>()
    const known = new Set(state.options.map((option) => option.value))
    return new Set(boundaryIds.filter((id) => !known.has(id)))
  }, [boundaryIds, state])

  function setRow(index: number, nextValue: string) {
    if (!nextValue) return
    onChange(set(boundaryIds.map((id, i) => (i === index ? nextValue : id))))
  }

  function removeRow(index: number) {
    const next = boundaryIds.filter((_, i) => i !== index)
    onChange(next.length ? set(next) : unset())
  }

  function addRow() {
    onChange(set([...boundaryIds, '']))
  }

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

  if (state.status === 'notice') {
    return (
      <Stack space={3}>
        <Card padding={3} radius={2} shadow={1} tone="caution">
          <Text size={1}>{state.message}</Text>
        </Card>
        {boundaryIds.length ? (
          <Text size={1} muted>
            Current values: <code>{boundaryIds.join(', ')}</code>
          </Text>
        ) : null}
      </Stack>
    )
  }

  return (
    <Stack space={3}>
      {boundaryIds.map((id, index) => {
        const otherNames = otherOwners.get(id)
        const rowOptions = state.options.filter(
          (option) => option.value === id || !boundaryIds.includes(option.value),
        )
        return (
          <Stack space={2} key={index}>
            <Flex gap={2} align="center">
              <Box flex={1}>
                <Autocomplete<BoundaryOption>
                  id={`boundary-${index}`}
                  options={rowOptions}
                  value={id}
                  placeholder="Search boundaries…"
                  openButton
                  readOnly={readOnly}
                  filterOption={(query, option) =>
                    option.label.toLowerCase().includes(query.toLowerCase()) ||
                    option.value.toLowerCase().includes(query.toLowerCase())
                  }
                  renderOption={(option) => (
                    <Card as="button" padding={3} radius={2}>
                      <Text size={1}>{option.label}</Text>
                    </Card>
                  )}
                  onChange={(nextValue) => setRow(index, nextValue)}
                />
              </Box>
              <Button
                icon={TrashIcon}
                mode="ghost"
                tone="critical"
                disabled={readOnly}
                onClick={() => removeRow(index)}
                aria-label="Remove boundary"
              />
            </Flex>
            {orphanedIds.has(id) ? (
              <Card padding={3} radius={2} shadow={1} tone="critical">
                <Text size={1}>
                  &ldquo;{id}&rdquo; is not in the uploaded boundary file, so it will not draw on
                  the map.
                </Text>
              </Card>
            ) : null}
            {otherNames?.length ? (
              <Card padding={3} radius={2} shadow={1} tone="caution">
                <Text size={1}>
                  Also assigned to: {otherNames.join(', ')}. Check this is intentional.
                </Text>
              </Card>
            ) : null}
          </Stack>
        )
      })}
      <Box>
        <Button
          icon={AddIcon}
          text="Add boundary"
          mode="ghost"
          disabled={readOnly}
          onClick={addRow}
        />
      </Box>
      <Text size={1} muted>
        {state.options.length} boundaries available.
      </Text>
    </Stack>
  )
}
