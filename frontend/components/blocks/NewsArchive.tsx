import {Suspense} from 'react'

import FilterTabs from '@/components/ui/FilterTabs'
import {NEWS_FILTER_LABEL, newsTabs} from '@/sanity/lib/archiveFilter'

import NewsFilter from './NewsFilter'
import NewsList from './NewsList'
import {BlockProps} from './types'

export default function NewsArchive({block}: BlockProps<'newsArchive'>) {
  const articles = block.articles ?? []
  if (articles.length === 0) return null
  const tabs = newsTabs(articles)
  const showTabs = Boolean(block.showFilters) && tabs.length > 0

  return (
    <section className="bg-background py-s6">
      <div className="flex w-full flex-col items-start gap-10 _tf-max-w">
        {showTabs ? (
          // useSearchParams needs a Suspense boundary on a statically rendered page. The fallback
          // is the same tabs and list with "All" pressed, so the page does not shift when the
          // filter takes over, and the server HTML is "All".
          <Suspense
            fallback={
              <div className="flex w-full flex-col items-start gap-12 md:gap-16">
                <FilterTabs tabs={tabs} active={null} label={NEWS_FILTER_LABEL} />
                <div className="tf-px">
                  <NewsList articles={articles} />
                </div>
              </div>
            }
          >
            <NewsFilter articles={articles} />
          </Suspense>
        ) : (
          <div className="tf-px">
            <NewsList articles={articles} />
          </div>
        )}
      </div>
    </section>
  )
}
