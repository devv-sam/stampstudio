import type { HTMLAttributes, ReactNode } from 'react'

export function Panel({
  title,
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title?: string
  children: ReactNode
}) {
  return (
    <div
      className={`rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 ${className}`}
      {...props}
    >
      {title ? (
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {title}
        </h3>
      ) : null}
      {children}
    </div>
  )
}
