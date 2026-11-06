import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const variantClass: Record<Variant, string> = {
  primary:
    'border border-[#5bcd8a] bg-[linear-gradient(180deg,#00cc55_0%,#07602c_100%)] text-[#fff]',
  secondary: 'border border-transparent bg-zinc-800 text-ink hover:bg-zinc-700',
  ghost: 'border border-transparent text-ink hover:bg-zinc-800',
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
      className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium whitespace-nowrap transition-[transform,background-color] duration-200 ease-out active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
