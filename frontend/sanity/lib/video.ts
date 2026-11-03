export type VideoEmbed = {provider: 'youtube' | 'vimeo'; src: string}

/**
 * The player address for a YouTube or Vimeo page address, or null when it is neither or has no
 * video id. YouTube plays from the no-cookie host. The accepted hosts are repeated in
 * studio/src/schemaTypes/objects/videoEmbed.ts, which cannot import this file; change both.
 */
export function videoEmbedSrc(address: string | null | undefined): VideoEmbed | null {
  if (!address) return null
  let url: URL
  try {
    url = new URL(address)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  const host = url.hostname.replace(/^(www|m)\./, '')
  const segments = url.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be') {
    const id = segments[0]
    return id && /^[\w-]{6,}$/.test(id)
      ? {provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}`}
      : null
  }
  if (host === 'youtube.com') {
    const id =
      segments[0] === 'watch'
        ? url.searchParams.get('v')
        : ['embed', 'shorts', 'live'].includes(segments[0] ?? '')
          ? segments[1]
          : null
    return id && /^[\w-]{6,}$/.test(id)
      ? {provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}`}
      : null
  }
  if (host === 'vimeo.com') {
    const id = segments.find((segment) => /^\d+$/.test(segment))
    return id ? {provider: 'vimeo', src: `https://player.vimeo.com/video/${id}`} : null
  }
  return null
}
