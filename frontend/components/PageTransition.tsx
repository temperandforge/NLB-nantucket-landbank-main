import {ViewTransition} from 'react'

/**
 * The soft handoff between pages: on a navigation the old page plays `page-out` and the new one
 * `page-in` (css/motion.css). Used inside each route's page.tsx, never a layout: layouts persist
 * across navigations, so enter and exit would never fire there. `default="none"` keeps it still
 * during unrelated transitions (Suspense reveals, a filter change).
 */
export default function PageTransition({children}: {children: React.ReactNode}) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  )
}
