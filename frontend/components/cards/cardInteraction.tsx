import {ArrowDownRightIcon} from '@/components/icons'

/**
 * Hover and keyboard-focus states shared by every linked image card (news, properties, projects,
 * the news preview tiles, the event rows). One definition so they cannot drift apart.
 *
 * The card's link carries `CARD_LINK` (it is the `group`); the pieces below react to it. Tailwind
 * applies `hover` only where the device can hover, so a tap never leaves a card stuck open. All
 * motion is dropped under reduced motion, leaving only the instant colour changes. Without a link
 * (a card with no destination) there is no group, so none of this ever shows.
 */

/** The group the states hang from, and a focus ring for keyboard users. For a link that sets its own layout. */
export const CARD_GROUP =
  'group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current'

/** On a card's link when it is simply a full-width block around the card. */
export const CARD_LINK = `block w-full ${CARD_GROUP}`

/** On the `<img>`: a slow zoom inside the image box, which must be `overflow-hidden`. */
export const CARD_IMAGE_ZOOM =
  'transition-transform duration-700 ease-out group-hover:scale-105 group-focus-visible:scale-105 group-has-[:focus-visible]:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100 motion-reduce:group-has-[:focus-visible]:scale-100'

/** On the title: the underline is always there but transparent, so it fades in without moving text. */
export const CARD_TITLE_LINK =
  'underline decoration-transparent decoration-1 underline-offset-4 transition-[text-decoration-color] duration-300 group-hover:decoration-current group-focus-visible:decoration-current group-has-[:focus-visible]:decoration-current motion-reduce:transition-none'

/**
 * An arrow chip in the top-right corner of the image, sliding in on hover or focus. Decorative:
 * the whole card is the link. Place it inside the image box (`relative`, `overflow-hidden`).
 */
export function CardArrow() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-4 right-4 z-10 flex size-10 -translate-y-1 items-center justify-center rounded-[4px] bg-background text-on-background opacity-0 transition-[opacity,translate] duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-has-[:focus-visible]:translate-y-0 group-has-[:focus-visible]:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none md:top-5 md:right-5"
    >
      {/* The set has a down-right arrow; turned a quarter back it points up and right. */}
      <ArrowDownRightIcon className="size-6 -rotate-90" />
    </span>
  )
}
