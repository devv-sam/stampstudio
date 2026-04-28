import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const variantClass: Record<Variant, string> = {
  primary:
    'bg-white text-zinc-950 hover:bg-zinc-100 border border-transparent shadow-sm',
  secondary:
    'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700',
  ghost:
    'bg-transparent text-zinc-300 hover:bg-zinc-800/80 border border-transparent',
}

export function Button({
  children,
  className = '',
  variant = 'secondary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: Variant
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
