import {stegaClean} from 'next-sanity'

import type {JsonLdGraph} from '@/sanity/lib/structuredData'

/**
 * `<` is escaped so a value such as "</script>" in a title cannot close the tag early; Next's
 * JSON-LD guide asks for exactly this. JSON.stringify does not sanitise on its own.
 */
export function serializeJsonLd(graph: JsonLdGraph): string {
  // In Presentation, strings carry invisible stega characters that must never reach a crawler.
  return JSON.stringify(stegaClean(graph)).replace(/</g, '\\u003c')
}

/** Renders each non-null graph as its own script tag, and nothing at all when there are none. */
export default function JsonLd({data}: {data: (JsonLdGraph | null | undefined)[] | JsonLdGraph | null}) {
  const graphs = (Array.isArray(data) ? data : [data]).filter((graph): graph is JsonLdGraph => Boolean(graph))
  return (
    <>
      {graphs.map((graph, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: serializeJsonLd(graph)}}
        />
      ))}
    </>
  )
}
