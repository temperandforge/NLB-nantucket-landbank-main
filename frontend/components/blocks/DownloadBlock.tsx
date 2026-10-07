import {BlockProps} from './types'

export default function DownloadBlock({block}: BlockProps<'downloadBlock'>) {
  const downloads = block.downloads?.filter((item) => item.fileUrl) ?? []
  return (
    <section className="w-full">
      <div className="max-w-[1360px] mx-auto px-10 py-8">
        {downloads.length > 0 && (
          <ul className="list-none m-0 p-0">
            {downloads.map((item) => (
              <li key={item._key} className="border-b border-dusty-heath-800">
                <a
                  className="flex justify-between py-3 no-underline text-inherit"
                  href={item.fileUrl ?? undefined}
                  download
                >
                  <span>{item.label || item.fileName}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
