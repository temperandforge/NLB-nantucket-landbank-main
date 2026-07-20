export default function Footer() {
  return (
    <footer className="bg-gray-50 relative">
      <div className="absolute inset-0 bg-[url(/images/tile-grid-black.png)] bg-size-[17px] opacity-20 bg-position-[0_1]" />
      <div className="container relative">
        <div className="flex flex-col items-center py-28 lg:flex-row">
          <div className="flex flex-col gap-3 items-center justify-center lg:w-1/2 lg:flex-row lg:pl-4">
            <a
              href="https://github.com/sanity-io/sanity-template-nextjs-clean"
              className="rounded-full flex gap-2 font-mono whitespace-nowrap items-center bg-black hover:bg-blue focus:bg-blue py-3 px-6 text-white transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
            <a href="https://nextjs.org/docs" className="mx-3 hover:underline font-mono">
              Read Next.js Documentation
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
