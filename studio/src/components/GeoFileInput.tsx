import {useEffect, useRef, useState, type ChangeEvent, type JSX} from 'react'
import {Box, Button, Card, Flex, Grid, Spinner, Stack, Text} from '@sanity/ui'
import {
  getPublishedId,
  getVersionFromId,
  useClient,
  useDocumentOperation,
  useFormValue,
  type FileInputProps,
} from 'sanity'

import {convertGeoFile, type ConversionResult} from '../lib/geoConversion'
import {
  applyPatch,
  checkSourceSize,
  describeError,
  formatBytes,
  generatedFilename,
  GENERATED_FIELD,
  removePatch,
  reportRows,
  type ErrorDisplay,
} from '../lib/geoFileInputModel'
import type {GeoLayer} from '../lib/geoReport'

/**
 * Upload input for the map files on Properties Settings. The editor uploads GPX / KML / KMZ /
 * GeoJSON; this converts it in the browser, shows a report, and on Apply stores the original in
 * this field and the converted GeoJSON in the read-only generated sibling the frontend reads.
 *
 * Writing the sibling: a field input's `onChange` cannot reach it. Studio prefixes every patch from
 * a member input with that member's name (`PatchEvent.prefixAll(member.name)` in ObjectInput), and
 * a patch path has no "parent" segment. So both fields are written with the document operation
 * `patch`, as ONE `set` - the same operation the form itself uses for edits - so the pair lands in a
 * single mutation and can never be half-applied. It is only executed after both asset uploads
 * have resolved; if either throws, nothing is patched (an asset that did upload is left
 * unreferenced, which Sanity tolerates).
 */

const SETTINGS_ID = 'projectSettings'
const SETTINGS_TYPE = 'projectSettings'

type FileRef = {asset?: {_ref?: string}} | undefined
type AssetInfo = {_id: string; originalFilename?: string; size?: number; url?: string}

type State =
  | {status: 'idle'}
  | {status: 'converting'; filename: string}
  | {status: 'review'; file: File; result: ConversionResult}
  | {status: 'uploading'; filename: string}
  | {status: 'error'; error: ErrorDisplay}

/** Lets React paint the spinner before the synchronous conversion blocks the main thread. */
const yieldToPaint = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))

export function geoFileInput(layer: GeoLayer): (props: FileInputProps) => JSX.Element {
  function GeoFileInputForLayer(props: FileInputProps) {
    return <GeoFileInput {...props} layer={layer} />
  }
  GeoFileInputForLayer.displayName = `GeoFileInput(${layer})`
  return GeoFileInputForLayer
}

function GeoFileInput(props: FileInputProps & {layer: GeoLayer}) {
  const {layer, value, readOnly, schemaType} = props
  const client = useClient({apiVersion: '2025-09-25'})

  // The form may be editing the draft or a release version; patch the same one it edits.
  const documentId = (useFormValue(['_id']) as string | undefined) ?? SETTINGS_ID
  const operations = useDocumentOperation(
    getPublishedId(documentId),
    SETTINGS_TYPE,
    getVersionFromId(documentId),
  )
  // Apply patches after awaiting uploads; read the operations from the latest render, not the one
  // that started the upload, so the patch is based on the current document snapshot.
  const latestOperations = useRef(operations)
  useEffect(() => {
    latestOperations.current = operations
  }, [operations])
  const idProperty = useFormValue(['boundaryIdProperty']) as string | undefined
  const generated = useFormValue([GENERATED_FIELD[layer]]) as FileRef

  const [state, setState] = useState<State>({status: 'idle'})
  const inputRef = useRef<HTMLInputElement>(null)
  const busy = state.status === 'converting' || state.status === 'uploading'
  const patchBlocked = operations.patch.disabled
  const disabled = Boolean(readOnly) || busy

  const sourceRef = (value as FileRef)?.asset?._ref
  const generatedRef = generated?.asset?._ref
  const assets = useAssets(client, sourceRef, generatedRef)

  async function onChoose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // so choosing the same file again still fires
    if (!file) return

    const tooLarge = checkSourceSize(file.size)
    if (tooLarge) {
      setState({status: 'error', error: {headline: 'File too large', message: tooLarge}})
      return
    }

    setState({status: 'converting', filename: file.name})
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      await yieldToPaint()
      const result = convertGeoFile({
        bytes,
        filename: file.name,
        layer,
        idProperty: layer === 'boundaries' ? idProperty || undefined : undefined,
        parseXml: (xml, mime) => new DOMParser().parseFromString(xml, mime),
      })
      setState({status: 'review', file, result})
    } catch (error) {
      setState({status: 'error', error: describeError(error, 'convert')})
    }
  }

  async function onApply() {
    if (state.status !== 'review') return
    const {file, result} = state
    if (patchBlocked) {
      setState({
        status: 'error',
        error: {headline: 'The document is not ready to edit yet. Try again in a moment.'},
      })
      return
    }
    setState({status: 'uploading', filename: file.name})
    try {
      const geojson = new Blob([JSON.stringify(result.geojson)], {type: 'application/geo+json'})
      // Both uploads must succeed before anything is written.
      const [source, converted] = await Promise.all([
        client.assets.upload('file', file, {filename: file.name}),
        client.assets.upload('file', geojson, {filename: generatedFilename(file.name)}),
      ])
      latestOperations.current.patch.execute([applyPatch(layer, source._id, converted._id)])
      setState({status: 'idle'})
    } catch (error) {
      setState({status: 'error', error: describeError(error, 'upload')})
    }
  }

  function onRemove() {
    if (patchBlocked) return
    operations.patch.execute([removePatch(layer)])
    setState({status: 'idle'})
  }

  const accept =
    typeof schemaType.options?.accept === 'string' ? schemaType.options.accept : undefined
  const hasAnything = Boolean(sourceRef || generatedRef)

  return (
    <Stack gap={3}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChoose}
        style={{display: 'none'}}
        disabled={disabled}
      />

      <FileRow
        label="Original"
        assetId={sourceRef}
        asset={sourceRef ? assets[sourceRef] : undefined}
        empty={generatedRef ? 'None kept' : 'No file uploaded'}
      />
      {generatedRef ? (
        <FileRow
          label={
            sourceRef ? 'Generated GeoJSON (read by the map)' : 'GeoJSON file (no original kept)'
          }
          assetId={generatedRef}
          asset={assets[generatedRef]}
        />
      ) : null}

      {state.status === 'converting' || state.status === 'uploading' ? (
        <Flex align="center" gap={2} paddingY={2}>
          <Spinner muted />
          <Text size={1} muted>
            {state.status === 'converting' ? 'Converting' : 'Uploading'} {state.filename}…
          </Text>
        </Flex>
      ) : null}

      {state.status === 'error' ? (
        <Card padding={3} radius={2} shadow={1} tone="critical">
          <Stack gap={3}>
            <Text size={1} weight="semibold">
              {state.error.headline}
            </Text>
            {state.error.message ? <Text size={1}>{state.error.message}</Text> : null}
            {state.error.detail ? (
              <Text size={1} muted>
                Details: {state.error.detail}
              </Text>
            ) : null}
          </Stack>
        </Card>
      ) : null}

      {state.status === 'review' ? (
        <Card padding={3} radius={2} shadow={1} tone="primary">
          <Stack gap={3}>
            <Text size={1} weight="semibold">
              {state.file.name}: check the conversion before applying
            </Text>
            <Grid gridTemplateColumns={[1, 1, 3]} gap={2}>
              {reportRows(state.result.report).map((row) => (
                <ReportRowView key={row.label} {...row} />
              ))}
            </Grid>
            <Flex gap={2}>
              <Button text="Apply" tone="primary" onClick={onApply} disabled={Boolean(readOnly)} />
              <Button text="Cancel" mode="ghost" onClick={() => setState({status: 'idle'})} />
            </Flex>
          </Stack>
        </Card>
      ) : (
        <Flex gap={2}>
          <Button
            text={hasAnything ? 'Replace file…' : 'Upload file…'}
            mode="ghost"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          />
          {hasAnything ? (
            <Button
              text="Remove"
              mode="ghost"
              tone="critical"
              onClick={onRemove}
              disabled={disabled || Boolean(patchBlocked)}
            />
          ) : null}
        </Flex>
      )}

      {layer === 'boundaries' ? (
        <Card padding={3} radius={2} tone="caution">
          <Text size={1}>
            Replacing the boundary file does not re-point any property&rsquo;s boundary assignment.
            Check properties for boundary warnings afterwards.
          </Text>
        </Card>
      ) : null}
    </Stack>
  )
}

function ReportRowView({label, value, warn}: {label: string; value: string; warn?: boolean}) {
  // The ID-property row can carry a long list of names, so it takes the full width.
  const wide = label === 'ID property'
  return (
    <Card
      padding={2}
      radius={2}
      tone={warn ? 'caution' : 'default'}
      style={wide ? {gridColumn: '1 / -1'} : undefined}
    >
      <Stack gap={2}>
        <Text size={0} muted>
          {label}
        </Text>
        <Text size={1}>{value}</Text>
      </Stack>
    </Card>
  )
}

function FileRow(props: {label: string; assetId?: string; asset?: AssetInfo; empty?: string}) {
  const {label, assetId, asset, empty} = props
  return (
    <Box>
      <Stack gap={2}>
        <Text size={0} muted>
          {label}
        </Text>
        {asset ? (
          <Text size={1}>
            {asset.url ? (
              <a href={asset.url} target="_blank" rel="noreferrer">
                {asset.originalFilename ?? asset._id}
              </a>
            ) : (
              (asset.originalFilename ?? asset._id)
            )}
            {typeof asset.size === 'number' ? ` · ${formatBytes(asset.size)}` : ''}
          </Text>
        ) : (
          <Text size={1} muted>
            {assetId ? 'Loading…' : empty}
          </Text>
        )}
      </Stack>
    </Box>
  )
}

/** Filename, size and URL of the referenced assets, keyed by asset id. */
function useAssets(
  client: ReturnType<typeof useClient>,
  sourceRef: string | undefined,
  generatedRef: string | undefined,
): Record<string, AssetInfo> {
  const [assets, setAssets] = useState<Record<string, AssetInfo>>({})

  useEffect(() => {
    const ids = [sourceRef, generatedRef].filter((id): id is string => Boolean(id))
    if (!ids.length) return
    let cancelled = false
    client
      .fetch<AssetInfo[]>(`*[_id in $ids]{_id, originalFilename, size, url}`, {ids})
      .then((found) => {
        if (cancelled) return
        setAssets((previous) => ({
          ...previous,
          ...Object.fromEntries(found.map((a) => [a._id, a])),
        }))
      })
      .catch(() => {
        // Display only: a failed lookup leaves the row on "Loading…" rather than breaking the form.
      })
    return () => {
      cancelled = true
    }
  }, [client, sourceRef, generatedRef])

  return assets
}
