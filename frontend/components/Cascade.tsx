import {Fragment} from 'react'
import {CASCADE_BODY_MAX_INDEX, CASCADE_MAX_INDEX, cascadeWords} from '@/sanity/lib/cascade'

type CascadeProps = {
  as?: 'h1' | 'h2' | 'h3' | 'p'
  className?: string
  text: string | null | undefined
  /** 'body' is for a hero description: a quicker sweep with no blur (see `.cascade-body` in motion.css). */
  variant?: 'headline' | 'body'
}

export default function Cascade({as: Tag = 'h1', className, text, variant = 'headline'}: CascadeProps) {
  const words = cascadeWords(text)
  if (words && words.length === 0) return null
  const maxIndex = variant === 'body' ? CASCADE_BODY_MAX_INDEX : CASCADE_MAX_INDEX
  const classes = variant === 'body' ? `cascade-body${className ? ` ${className}` : ''}` : className

  // Words are inline-block, so `break-words` / `hyphens` cannot break inside a word: a call site
  // with an unbreakable long word must handle that itself.

  // Stega-encoded text (visual editing) can't be split without breaking its markers.
  if (!words) return <Tag className={classes}>{text}</Tag>

  return (
    <Tag className={classes}>
      {words.map((word, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          <span
            className="cascade-word"
            style={{'--i': Math.min(i, maxIndex)} as React.CSSProperties}
          >
            {word}
          </span>
        </Fragment>
      ))}
    </Tag>
  )
}
