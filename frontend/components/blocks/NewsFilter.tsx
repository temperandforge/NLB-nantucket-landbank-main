'use client'

import type {NewsItem} from '@/components/cards/types'
import FilterTabs from '@/components/ui/FilterTabs'
import {NEWS_CATEGORY_PARAM, NEWS_FILTER_LABEL, filterByNewsCategory, newsTabs} from '@/sanity/lib/archiveFilter'

import NewsList from './NewsList'
import {useQueryFilter} from './useQueryFilter'

/** The articles with category tabs. Only used when there are tabs to show (NewsArchive renders a plain list otherwise). */
export default function NewsFilter({articles}: {articles: NewsItem[]}) {
  const tabs = newsTabs(articles)
  const {active, choose} = useQueryFilter(NEWS_CATEGORY_PARAM, tabs)

  return (
    <div className="flex w-full flex-col items-start gap-12 md:gap-16">
      <FilterTabs tabs={tabs} active={active} label={NEWS_FILTER_LABEL} onChoose={choose} />
      <NewsList articles={filterByNewsCategory(articles, active)} />
    </div>
  )
}
