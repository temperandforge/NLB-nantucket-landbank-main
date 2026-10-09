/**
 * Icons exported from the Nantucket Figma design system.
 *
 * Each glyph keeps the viewBox it was exported with, so its proportions inside the outer box
 * the design specifies are preserved exactly - the social glyphs are inset within their 29px
 * boxes rather than filling them. Fills use currentColor so a parent can set the colour.
 */

type IconProps = {
  className?: string
}

/** Figma: Icon / Facebook (89:38). Exported at 24.1667 inside a 29px box. */
export function FacebookIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 24.1667 24.1667"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M24.1667 12.1572C24.1667 5.44295 18.7568 0 12.0833 0C5.40989 0 0 5.44295 0 12.1572C0 18.225 4.41868 23.2546 10.1953 24.1667V15.6714H7.12728V12.1572H10.1953V9.47879C10.1953 6.43191 11.9994 4.74889 14.7593 4.74889C16.0815 4.74889 17.4642 4.98634 17.4642 4.98634V7.97815H15.9406C14.4396 7.97815 13.9714 8.91535 13.9714 9.87679V12.1572H17.3225L16.7869 15.6714H13.9714V24.1667C19.748 23.2546 24.1667 18.2253 24.1667 12.1572Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Figma: Icon / Instagram (89:40). Exported at 21.75 inside a 29px box. */
export function InstagramIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 21.75 21.75"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.7083 0H6.04167C2.70495 0 0 2.70495 0 6.04167V15.7083C0 19.045 2.70495 21.75 6.04167 21.75H15.7083C19.045 21.75 21.75 19.045 21.75 15.7083V6.04167C21.75 2.70495 19.045 0 15.7083 0ZM19.6354 15.7083C19.6288 17.8744 17.8744 19.6288 15.7083 19.6354H6.04167C3.87555 19.6288 2.12122 17.8744 2.11458 15.7083V6.04167C2.12122 3.87555 3.87555 2.12122 6.04167 2.11458H15.7083C17.8744 2.12122 19.6288 3.87555 19.6354 6.04167V15.7083ZM16.6146 6.34375C17.2819 6.34375 17.8229 5.80276 17.8229 5.13542C17.8229 4.46808 17.2819 3.92708 16.6146 3.92708C15.9472 3.92708 15.4063 4.46808 15.4063 5.13542C15.4063 5.80276 15.9472 6.34375 16.6146 6.34375ZM10.875 5.4375C7.87195 5.4375 5.4375 7.87195 5.4375 10.875C5.4375 13.8781 7.87195 16.3125 10.875 16.3125C13.8781 16.3125 16.3125 13.8781 16.3125 10.875C16.3158 9.43189 15.7439 8.04698 14.7234 7.02655C13.703 6.00613 12.3181 5.43429 10.875 5.4375ZM7.55208 10.875C7.55208 12.7102 9.03978 14.1979 10.875 14.1979C12.7102 14.1979 14.1979 12.7102 14.1979 10.875C14.1979 9.03978 12.7102 7.55208 10.875 7.55208C9.03978 7.55208 7.55208 9.03978 7.55208 10.875Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Figma: Icon / LinkedIn (89:42). Exported at 21.75 inside a 29px box. */
export function LinkedInIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 21.75 21.75"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.8125 0C0.81148 0 0 0.81148 0 1.8125V19.9375C0 20.9385 0.81148 21.75 1.8125 21.75H19.9375C20.9385 21.75 21.75 20.9385 21.75 19.9375V1.8125C21.75 0.81148 20.9385 0 19.9375 0H1.8125ZM6.67092 4.83662C6.67772 5.99209 5.81282 6.70406 4.78649 6.69896C3.81963 6.69386 2.97681 5.92412 2.98191 4.83832C2.98701 3.81709 3.79414 2.99636 4.84257 3.02016C5.90627 3.04395 6.67772 3.82389 6.67092 4.83662ZM11.213 8.17046H8.16798H8.16628V18.5136H11.3846V18.2723C11.3846 17.8133 11.3842 17.3541 11.3838 16.8948C11.3829 15.6698 11.3818 14.4435 11.3881 13.2188C11.3897 12.9214 11.4033 12.6122 11.4798 12.3284C11.7669 11.2681 12.7202 10.5833 13.7839 10.7516C14.467 10.8586 14.9189 11.2545 15.1092 11.8986C15.2266 12.3012 15.2793 12.7345 15.2843 13.1543C15.2981 14.4201 15.2962 15.686 15.2942 16.952C15.2935 17.3988 15.2928 17.8459 15.2928 18.2927V18.5119H18.5213V18.2638C18.5213 17.7177 18.5211 17.1716 18.5207 16.6256C18.5201 15.2608 18.5194 13.896 18.523 12.5307C18.5247 11.9138 18.4585 11.3055 18.3072 10.7091C18.0813 9.82206 17.614 9.088 16.8544 8.5579C16.3158 8.18065 15.7244 7.93766 15.0634 7.91048C14.9882 7.90735 14.9123 7.90325 14.836 7.89913C14.4981 7.88086 14.1545 7.8623 13.8314 7.92746C12.9071 8.11268 12.0949 8.53579 11.4815 9.28169C11.4102 9.36724 11.3405 9.45412 11.2364 9.58378L11.213 9.61314V8.17046ZM3.24032 18.517H6.44334V8.17719H3.24032V18.517Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Figma: arrow_forward (89:60). Exported at 24 inside the 42px submit button. */
export function ArrowForwardIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M16.627 12.75H4.5V11.25H16.627L10.9308 5.55375L12 4.5L19.5 12L12 19.5L10.9308 18.4462L16.627 12.75Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Arrow pointing right. Figma: Icon / Arrow right. 24 x 24. */
export function ArrowRightIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M5 12H19M12 19L19 12L12 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Arrow pointing left: the right arrow's own geometry, mirrored. */
export function ArrowLeftIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M19 12H5M12 19L5 12L12 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Download tray with arrow. Figma: Icon / Download. 24 x 24. */
export function DownloadIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 10L12 15L7 10M12 15V3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Clock, from nlb-design's events preview. 24 x 24. */
export function ClockIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className={className}>
      <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 9V13L14.5 14.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 2H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Map pin, from nlb-design's events preview. 24 x 24. */
export function MapPinIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M12 22C12 22 19 15.4183 19 10C19 5.58172 15.866 2 12 2C8.13401 2 5 5.58172 5 10C5 15.4183 12 22 12 22Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

/** Large arrow pointing down and right, from nlb-design's news preview call to action. 70 x 69. */
export function ArrowDownRightIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 70 69" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M57.9762 61.5984L0 4.70981L4.79985 0L62.776 56.8886L62.776 2.32783L69.5978 2.35491L69.5978 68.2922L2.39991 68.2922L2.37231 61.5984L57.9762 61.5984Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Chevron pointing down. Figma: chevron-down. 24 x 24. */
export function ChevronDownIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Chevron pointing up. Figma: chevron-up. 24 x 24. */
export function ChevronUpIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path d="M18 15L12 9L6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Link, from the Figma news template's Share row (Icon / link-alt). 24 x 24. */
export function LinkAltIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M4.22196 19.778C4.68584 20.2425 5.23693 20.6108 5.84358 20.8617C6.45023 21.1126 7.10048 21.2411 7.75696 21.24C8.41359 21.2411 9.06398 21.1125 9.67079 20.8617C10.2776 20.6108 10.8289 20.2425 11.293 19.778L14.121 16.949L12.707 15.535L9.87896 18.364C9.31543 18.925 8.55263 19.2399 7.75746 19.2399C6.96229 19.2399 6.19949 18.925 5.63596 18.364C5.07447 17.8007 4.75917 17.0378 4.75917 16.2425C4.75917 15.4471 5.07447 14.6842 5.63596 14.121L8.46496 11.293L7.05096 9.87896L4.22196 12.707C3.28577 13.6454 2.76001 14.9169 2.76001 16.2425C2.76001 17.568 3.28577 18.8395 4.22196 19.778ZM19.778 11.293C20.7137 10.3542 21.2391 9.08288 21.2391 7.75746C21.2391 6.43204 20.7137 5.16068 19.778 4.22196C18.8395 3.28577 17.568 2.76001 16.2425 2.76001C14.9169 2.76001 13.6454 3.28577 12.707 4.22196L9.87896 7.05096L11.293 8.46496L14.121 5.63596C14.6845 5.07495 15.4473 4.75999 16.2425 4.75999C17.0376 4.75999 17.8004 5.07495 18.364 5.63596C18.9255 6.19923 19.2408 6.96213 19.2408 7.75746C19.2408 8.55279 18.9255 9.31569 18.364 9.87896L15.535 12.707L16.949 14.121L19.778 11.293Z"
        fill="currentColor"
      />
      <path d="M8.46395 16.95L7.04895 15.536L15.536 7.05005L16.95 8.46505L8.46395 16.95Z" fill="currentColor" />
    </svg>
  )
}

/** Figma: map-pinned (2570:12334). A pin over a base, 24 x 24, drawn with a 2px stroke. */
export function MapPinnedIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M8.714 14H5.004C4.79433 14.0001 4.58999 14.0661 4.41987 14.1886C4.24976 14.3112 4.12247 14.4841 4.056 14.683L2.052 20.683C2.00176 20.8333 1.98797 20.9934 2.01175 21.1501C2.03554 21.3068 2.09623 21.4556 2.18882 21.5842C2.28141 21.7128 2.40324 21.8176 2.54428 21.8899C2.68532 21.9622 2.84152 21.9999 3 22H21C21.1584 21.9999 21.3144 21.9621 21.4554 21.8899C21.5963 21.8177 21.7181 21.713 21.8106 21.5845C21.9032 21.456 21.9639 21.3074 21.9878 21.1508C22.0117 20.9942 21.998 20.8343 21.948 20.684L19.948 14.684C19.8817 14.4848 19.7543 14.3115 19.584 14.1888C19.4136 14.066 19.209 13.9999 18.999 14H15.287M18 8C18 11.613 14.131 15.429 12.607 16.795C12.4327 16.9282 12.2194 17.0003 12 17.0003C11.7806 17.0003 11.5673 16.9282 11.393 16.795C9.87 15.429 6 11.613 6 8C6 6.4087 6.63214 4.88258 7.75736 3.75736C8.88258 2.63214 10.4087 2 12 2C13.5913 2 15.1174 2.63214 16.2426 3.75736C17.3679 4.88258 18 6.4087 18 8ZM14 8C14 9.10457 13.1046 10 12 10C10.8954 10 10 9.10457 10 8C10 6.89543 10.8954 6 12 6C13.1046 6 14 6.89543 14 8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Figma: briefcase-business (2570:12328). 24 x 24, drawn with a 2px stroke. */
export function BriefcaseBusinessIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M12 12H12.01M16 6V4C16 3.46957 15.7893 2.96086 15.4142 2.58579C15.0391 2.21071 14.5304 2 14 2H10C9.46957 2 8.96086 2.21071 8.58579 2.58579C8.21071 2.96086 8 3.46957 8 4V6M22 13C19.0328 14.959 15.5555 16.0033 12 16.0033C8.44445 16.0033 4.96721 14.959 2 13M4 6H20C21.1046 6 22 6.89543 22 8V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V8C2 6.89543 2.89543 6 4 6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Magnifier. Figma: nav search glyph (mobile-glyph-2). 20 x 20, 2px stroke. */
export function SearchIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M19 19L14.7 14.7M17 9C17 13.4183 13.4183 17 9 17C4.58172 17 1 13.4183 1 9C1 4.58172 4.58172 1 9 1C13.4183 1 17 4.58172 17 9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Close x. Figma: banner dismiss glyph (x). 10 x 10, 2px stroke. The viewBox keeps the
 * export's own page offset (1385, 12) so the path data is exactly as exported.
 */
export function CloseIcon({className}: IconProps) {
  return (
    <svg overflow="visible" viewBox="1385 12 10 10" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M1395 12L1385 22M1385 12L1395 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Hamburger. Figma: nav menu glyph (mobile-glyph-1). 18 x 14, 2px stroke. */
export function MenuIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 18 14" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M1 7H17M1 1H17M1 13H17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
