import {Fragment} from 'react'
import {CASCADE_MAX_INDEX, cascadeWords} from '@/sanity/lib/cascade'

type CascadeProps = {
  as?: 'h1' | 'h2' | 'h3' | 'p'
  className?: string
  text: string | null | undefined
}

export default function Cascade({as: Tag = 'h1', className, text}: CascadeProps) {
  if (!text) return null
  const words = cascadeWords(text)

  // Stega-encoded text (visual editing) can't be split without breaking its markers.
  if (!words) return <Tag className={className}>{text}</Tag>

  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          <span
            className="cascade-word"
            style={{'--i': Math.min(i, CASCADE_MAX_INDEX)} as React.CSSProperties}
          >
            {word}
          </span>
        </Fragment>
      ))}
    </Tag>
  )
}
