import type { SelectHTMLAttributes } from 'react'

export function Select({
  children,
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={`appearance-none bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-md px-3 py-2 pr-8 text-sm font-medium transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-white/20 ${className}`}
        {...props}
      >
        {children}
      </select>
      <svg 
        className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 pointer-events-none" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}