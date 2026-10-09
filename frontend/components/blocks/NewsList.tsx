import CardNews from '@/components/cards/CardNews'
import type {NewsItem} from '@/components/cards/types'

/** The articles, 3 columns at md. Figma: 12px between columns, 64px between rows (24px on mobile). */
export default function NewsList({articles}: {articles: NewsItem[]}) {
  return (
    <ul className="grid tf-max-w w-full list-none grid-cols-1 gap-x-3 gap-y-6 p-0 md:grid-cols-3 md:gap-y-16">
      {articles.map((article) => (
        <li key={article._id}>
          <CardNews article={article} />
        </li>
      ))}
    </ul>
  )
}
