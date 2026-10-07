import type {DepartmentTab} from '@/sanity/lib/staffFilter'

const TAB =
  'cursor-pointer whitespace-nowrap text-headline-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500'

/**
 * The department tabs (Figma: All, then each department), as buttons with a pressed state rather
 * than page links. Presentational, so the server can render it too: the Suspense fallback shows
 * the same row with "All" pressed, which keeps the page from shifting when the filter takes over.
 * Without `onChoose` the buttons do nothing (only until the page has loaded).
 */
export default function DepartmentTabs({
  tabs,
  active,
  onChoose,
}: {
  tabs: DepartmentTab[]
  active: string | null
  onChoose?: (slug: string | null) => void
}) {
  const cls = (pressed: boolean) =>
    `${TAB} ${pressed ? 'text-on-background' : 'text-on-background-subtle'}`
  return (
    <div
      role="group"
      aria-label="Filter staff by department"
      className="flex w-full items-center gap-10 overflow-x-auto px-1 py-2"
    >
      <button
        type="button"
        aria-pressed={active === null}
        onClick={onChoose ? () => onChoose(null) : undefined}
        className={cls(active === null)}
      >
        All
      </button>
      {tabs.map((tab) => (
        <button
          key={tab.slug}
          type="button"
          aria-pressed={active === tab.slug}
          onClick={onChoose ? () => onChoose(tab.slug) : undefined}
          className={cls(active === tab.slug)}
        >
          {tab.title}
        </button>
      ))}
    </div>
  )
}
