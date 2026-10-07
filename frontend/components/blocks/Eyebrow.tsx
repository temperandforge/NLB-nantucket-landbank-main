/** The small uppercase mono label that sits above a block's heading. */
export default function Eyebrow({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <p className={`font-mono uppercase tracking-widest text-sm ${className}`}>{children}</p>
}
