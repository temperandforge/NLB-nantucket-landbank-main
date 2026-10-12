import {Autocomplete, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import type {ArrayOfPrimitivesInputProps} from 'sanity'
import {set, unset} from 'sanity'

import {useBoundaryOptions} from './useBoundaryOptions'

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
      <Stack space={3}>
        <Card padding={3} radius={2} shadow={1} tone="caution">
          <Text size={1}>{state.message}</Text>
        </Card>
        {selected.length ? (
          <Stack space={2}>
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
  const availableOptions = state.options.filter((option) => !selected.includes(option.value))

  return (
    <Stack space={3}>
      <Autocomplete
        id={elementProps.id}
        ref={elementProps.ref}
        onBlur={elementProps.onBlur}
        onFocus={elementProps.onFocus}
        readOnly={readOnly}
        options={availableOptions}
        value=""
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
      <Stack space={2}>
        {selected.map((id) => {
          const isOrphaned = !labelById.has(id)
          return (
            <Card
              key={id}
              padding={3}
              radius={2}
              shadow={1}
              tone={isOrphaned ? 'critical' : 'default'}
            >
              <Flex align="center" justify="space-between" gap={3}>
                <Text size={1}>
                  {isOrphaned
                    ? `"${id}" is not in the uploaded boundary file`
                    : labelById.get(id)}
                </Text>
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
        {availableOptions.length} of {state.options.length} boundaries available to add.
      </Text>
    </Stack>
  )
}
