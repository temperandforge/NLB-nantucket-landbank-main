import {useCallback, useRef, useState} from 'react'
import {Button, Card, Flex, Stack, Text, useToast} from '@sanity/ui'
import {type FileInputProps, set, unset, useClient} from 'sanity'
import {gpxToGeoJson} from '../lib/gpxToGeoJson'

/**
 * Wraps the default file input for `boundaryData` / `trailsData`. A `.gpx` selection is
 * converted to GeoJSON client-side before upload — the stored asset is always GeoJSON, the
 * original GPX is never kept. Any other file type uploads unchanged.
 */
export default function GpxAwareFileInput(props: FileInputProps) {
  const {value, onChange, readOnly} = props
  const client = useClient({apiVersion: '2025-09-25'})
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const isGpx = file.name.toLowerCase().endsWith('.gpx')
        const uploadBlob = isGpx
          ? new Blob([JSON.stringify(gpxToGeoJson(await file.text()))], {
              type: 'application/geo+json',
            })
          : file
        const filename = isGpx ? file.name.replace(/\.gpx$/i, '.geojson') : file.name

        const asset = await client.assets.upload('file', uploadBlob, {filename})
        onChange(set({_type: 'file', asset: {_type: 'reference', _ref: asset._id}}))
        toast.push({
          status: 'success',
          title: isGpx ? 'Converted GPX file and uploaded as GeoJSON' : 'File uploaded',
        })
      } catch (error) {
        toast.push({
          status: 'error',
          title: 'Upload failed',
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [client, onChange, toast],
  )

  return (
    <Stack space={3}>
      {value?.asset?._ref ? (
        <Card padding={3} radius={2} shadow={1} tone="positive">
          <Text size={1}>A file is uploaded. Choose a new file below to replace it.</Text>
        </Card>
      ) : null}
      <Flex gap={2} align="center">
        <Button
          text={uploading ? 'Uploading…' : 'Select file…'}
          disabled={readOnly || uploading}
          onClick={() => inputRef.current?.click()}
        />
        {value?.asset?._ref ? (
          <Button
            text="Remove"
            tone="critical"
            mode="ghost"
            disabled={readOnly || uploading}
            onClick={() => onChange(unset())}
          />
        ) : null}
      </Flex>
      <input
        ref={inputRef}
        type="file"
        accept=".geojson,.json,application/geo+json,application/json,.gpx,application/gpx+xml"
        style={{display: 'none'}}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </Stack>
  )
}
