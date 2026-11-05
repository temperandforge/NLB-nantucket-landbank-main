/**
 * What stands in for the Map Explorer until it can render.
 *
 * The explorer reads its filters with `useSearchParams`, so it sits behind a Suspense boundary and
 * its own HTML is empty until the client takes over. With no fallback the page was just the hero and
 * the footer, so the footer painted first (it was the largest paint) and then jumped down about
 * 600px when the filters and map arrived: a 0.38 layout shift on mobile.
 *
 * This holds that space instead. Keep its structure and sizes in step with MapExplorer.tsx: the
 * same wrapper classes, the same dropdown trigger classes, and the same map box height. It is
 * decoration, so it is hidden from assistive technology and takes no interaction.
 */
export function MapExplorerSkeleton() {
  const trigger =
    'flex w-full items-center justify-between gap-2 rounded border border-transparent bg-input px-5 py-4 font-mono text-body-base text-on-input sm:w-[214px]'

  return (
    <div className="tf-px w-full" aria-hidden="true">
      <div className="tf-max-w flex flex-col gap-10 py-10">
        <div className="container--inner flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className={trigger}>
              <span>Property Type</span>
              <span className="size-6 shrink-0" />
            </div>
            <div className={trigger}>
              <span>Resources</span>
              <span className="size-6 shrink-0" />
            </div>
          </div>
        </div>
        <div className="relative h-[428px] bg-on-background-tonal md:h-[738px]" />
      </div>
    </div>
  )
}
