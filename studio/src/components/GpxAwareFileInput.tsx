import {useCallback, useRef, useState} from 'react'
import {Button, Flex, Stack, useToast} from '@sanity/ui'
import {type FileInputProps, set, useClient} from 'sanity'
import {gpxToGeoJson} from '../lib/gpxToGeoJson'

/**
 * Wraps the default file input for `boundaryData` / `trailsData`. Every file type keeps the
 * default Sanity file input (drag-and-drop, asset library, upload progress, file details) via
 * `renderDefault`. A `.gpx` selection needs its bytes converted to GeoJSON before upload, which
 * the default input has no hook for, so that path is a separate control added alongside it —
 * the converted result is uploaded and set exactly as the default input would set an upload.
 */
export default function GpxAwareFileInput(props: FileInputProps) {
  const {onChange, readOnly, schemaType, renderDefault} = props
  const client = useClient({apiVersion: '2025-09-25'})
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const accept = schemaType.options?.accept ?? '.gpx,application/gpx+xml'

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const uploadBlob = new Blob([JSON.stringify(gpxToGeoJson(await file.text()))], {
          type: 'application/geo+json',
        })
        const filename = file.name.replace(/\.gpx$/i, '.geojson')

        const asset = await client.assets.upload('file', uploadBlob, {filename})
        onChange(set({_type: 'file', asset: {_type: 'reference', _ref: asset._id}}))
        toast.push({
          status: 'success',
          title: 'Converted GPX file and uploaded as GeoJSON',
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
      {renderDefault(props)}
      <Flex gap={2} align="center">
        <Button
          text={uploading ? 'Converting…' : 'Or upload a GPX file…'}
          mode="ghost"
          disabled={readOnly || uploading}
          onClick={() => inputRef.current?.click()}
        />
      </Flex>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{display: 'none'}}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </Stack>
  )
}
