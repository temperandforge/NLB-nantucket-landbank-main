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
