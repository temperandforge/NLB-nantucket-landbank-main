import {Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {Autocomplete} from '@sanity/ui/autocomplete'
import {useEffect, useState} from 'react'
import type {ArrayOfPrimitivesInputProps} from 'sanity'
import {getPublishedId, set, unset, useClient, useFormValue} from 'sanity'

import {useBoundaryOptions} from './useBoundaryOptions'

/**
 * Which boundary ids other properties already use, mapped to the name of the property that has
 * them. A parcel normally belongs to one property; offering one that is taken would draw two
 * overlapping polygons and leave it unclear which property's popup a click opens.
 *
 * Reads drafts as well as published documents (an assignment is taken as soon as it is made, not
 * when it is published), and leaves out this property's own draft and published copies so its own
 * parcels are not reported as taken. Fetched once when the form opens, so an assignment made on
 * another property after that shows up the next time this form is opened.
 */
function useIdsAssignedElsewhere(): Map<string, string> {
  const client = useClient({apiVersion: '2025-09-25'})
  const documentId = useFormValue(['_id'])
  const [assigned, setAssigned] = useState<Map<string, string>>(() => new Map())

  useEffect(() => {
    let cancelled = false
    const publishedId = typeof documentId === 'string' ? getPublishedId(documentId) : ''

    client
      .fetch<Array<{_id: string; name?: string; boundaryIds?: string[]}>>(
        `*[_type == "property" && defined(boundaryIds) && !(_id in [$publishedId, "drafts." + $publishedId])]{_id, name, boundaryIds}`,
        {publishedId},
        {perspective: 'raw'},
      )
      .then((others) => {
        if (cancelled) return
        const next = new Map<string, string>()
        for (const other of others) {
          for (const id of other.boundaryIds ?? []) {
            if (!next.has(id)) next.set(id, other.name || 'another property')
          }
        }
        setAssigned(next)
      })
      .catch(() => {
        // Degrade to offering every boundary: a failed lookup must not stop an editor assigning one.
      })

    return () => {
      cancelled = true
    }
  }, [client, documentId])

  return assigned
}

/**
 * Picker for a project's parcels in the uploaded map data file. A property can be made of several
 * separate GIS parcels sharing one name (e.g. 28 features named "Smooth Hummocks Coastal
 * Preserve"), so this is a multi-select rather than the single-value picker it replaces: an
 * autocomplete to add a parcel, plus the ones already picked as a removable chip list.
 *
 * Each chip is checked against the uploaded file independently, so a stale assignment on a
 * project with several parcels shows exactly which one no longer exists, not a blanket warning.
 */
export function BoundaryIdsInput(props: ArrayOfPrimitivesInputProps) {
  const {value, onChange, elementProps, readOnly} = props
  const state = useBoundaryOptions()
  const takenElsewhere = useIdsAssignedElsewhere()
  const selected = (Array.isArray(value) ? value.filter((v) => typeof v === 'string') : []) as string[]

  function addId(id: string) {
    if (selected.includes(id)) return
    onChange(set([...selected, id]))
  }

  function removeId(id: string) {
    const next = selected.filter((existing) => existing !== id)
    onChange(next.length ? set(next) : unset())
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
      <Stack gap={3}>
        <Card padding={3} radius={2} shadow={1} tone="caution">
          <Text size={1}>{state.message}</Text>
        </Card>
        {selected.length ? (
          <Stack gap={2}>
            {selected.map((id) => (
              <Text key={id} size={1} muted>
                Current value: <code>{id}</code>
              </Text>
            ))}
          </Stack>
        ) : null}
      </Stack>
    )
  }

  const labelById = new Map(state.options.map((option) => [option.value, option.label]))
  const availableOptions = state.options.filter(
    (option) => !selected.includes(option.value) && !takenElsewhere.has(option.value),
  )
  const hiddenAsTaken = state.options.filter(
    (option) => !selected.includes(option.value) && takenElsewhere.has(option.value),
  ).length

  return (
    <Stack gap={3}>
      <Autocomplete
        id={elementProps.id}
        ref={elementProps.ref}
        onBlur={elementProps.onBlur}
        onFocus={elementProps.onFocus}
        readOnly={readOnly}
        options={availableOptions}
        value=""
        // Autocomplete keeps its own value after a pick and, by default, shows it in the idle input.
        // This is a pick-to-add control, so the picked id would linger in the box and the next search
        // would be typed on the end of it (matching nothing). Always show an empty box instead.
        renderValue={() => ''}
        placeholder="Search parcels to add…"
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
          if (nextValue) addId(nextValue)
        }}
      />
      <Stack gap={2}>
        {selected.map((id) => {
          const isOrphaned = !labelById.has(id)
          const otherOwner = takenElsewhere.get(id)
          return (
            <Card
              key={id}
              padding={3}
              radius={2}
              shadow={1}
              tone={isOrphaned ? 'critical' : otherOwner ? 'caution' : 'default'}
            >
              <Flex align="center" justify="space-between" gap={3}>
                <Stack gap={2}>
                  <Text size={1}>
                    {isOrphaned
                      ? `"${id}" is not in the uploaded boundary file`
                      : labelById.get(id)}
                  </Text>
                  {otherOwner ? (
                    <Text size={1} muted>
                      Also assigned to {otherOwner}. Remove it from one of them.
                    </Text>
                  ) : null}
                </Stack>
                <Card
                  as="button"
                  padding={2}
                  radius={2}
                  tone="default"
                  onClick={() => removeId(id)}
                >
                  <Text size={1}>Remove</Text>
                </Card>
              </Flex>
            </Card>
          )
        })}
        {!selected.length ? (
          <Text size={1} muted>
            No parcels assigned yet.
          </Text>
        ) : null}
      </Stack>
      <Text size={1} muted>
        {availableOptions.length} of {state.options.length} boundaries available to add
        {hiddenAsTaken > 0 ? ` (${hiddenAsTaken} hidden: assigned to other properties)` : ''}.
      </Text>
    </Stack>
  )
}
