import {ENTER_LOAD_BLOCKS, enterAttrs} from '@/sanity/lib/enter'

type EnterProps = {
  /**
   * Which layer this section belongs to: 0 or 1 plays on load (the first screen), anything later
   * animates as it scrolls into view. Omit for the scroll layer.
   */
  index?: number
  className?: string
  children: React.ReactNode
}

/**
 * Tags a section of a page that is not a page-builder block (the detail pages) so motion.css
 * animates its parts the way it does for a block. BlockRenderer does the same for blocks.
 */
export default function Enter({index = ENTER_LOAD_BLOCKS, className, children}: EnterProps) {
  return (
    <div className={className} {...enterAttrs(index)}>
      {children}
    </div>
  )
}
