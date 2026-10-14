import {MetadataRoute} from 'next'
import {sanityFetch} from '@/sanity/lib/live'
import {articleSitemapData, eventSitemapData, projectSitemapData, propertySitemapData, sitemapData} from '@/sanity/lib/queries'
import {headers} from 'next/headers'

/**
 * This file creates a sitemap (sitemap.xml) for the application. Learn more about sitemaps in Next.js here: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 * Be sure to update the `changeFrequency` and `priority` values to match your application's content.
 */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allPages = await sanityFetch({
    query: sitemapData,
  })
  const headersList = await headers()
  const sitemap: MetadataRoute.Sitemap = []
  const domain: string = headersList.get('host') as string
  sitemap.push({
    url: domain as string,
    lastModified: new Date(),
    priority: 1,
    changeFrequency: 'monthly',
  })

  if (allPages != null && allPages.data.length != 0) {
    for (const p of allPages.data) {
      sitemap.push({
        lastModified: p._updatedAt || new Date(),
        priority: 0.8,
        changeFrequency: 'monthly',
        url: `${domain}/${p.slug}`,
      })
    }
  }

  const articles = await sanityFetch({query: articleSitemapData})
  for (const article of articles.data) {
    if (!article.slug) continue
    sitemap.push({
      lastModified: article._updatedAt || new Date(),
      priority: 0.6,
      changeFrequency: 'monthly',
      url: `${domain}/news/${article.slug}`,
    })
  }

  const projects = await sanityFetch({query: projectSitemapData})
  for (const project of projects.data) {
    if (!project.slug) continue
    sitemap.push({
      lastModified: project._updatedAt || new Date(),
      priority: 0.6,
      changeFrequency: 'monthly',
      url: `${domain}/projects/${project.slug}`,
    })
  }

  const properties = await sanityFetch({query: propertySitemapData})
  for (const property of properties.data) {
    if (!property.slug) continue
    sitemap.push({
      lastModified: property._updatedAt || new Date(),
      priority: 0.6,
      changeFrequency: 'monthly',
      url: `${domain}/properties/${property.slug}`,
    })
  }

  const events = await sanityFetch({query: eventSitemapData})
  for (const event of events.data) {
    if (!event.slug) continue
    sitemap.push({
      lastModified: event._updatedAt || new Date(),
      priority: 0.6,
      changeFrequency: 'monthly',
      url: `${domain}/events/${event.slug}`,
    })
  }

  return sitemap
}
