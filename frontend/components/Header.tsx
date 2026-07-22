// import Link from 'next/link'
import {settingsQuery} from '@/sanity/lib/queries'
import {sanityFetch} from '@/sanity/lib/live'

export default async function Header() {
  const {data: settings} = await sanityFetch({
    query: settingsQuery,
  })

  return (
    <header className="fixed z-50 h-24 inset-0 bg-white flex items-center px-5">
      <h1 className="text-2xl font-bold">{settings?.title || 'Default Title'}</h1>
    </header>
  )
}
