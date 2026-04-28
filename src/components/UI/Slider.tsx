import type { InputHTMLAttributes } from 'react'

export function Slider({
  label,
  valueLabel,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  valueLabel: string
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <div className="flex items-center justify-between gap-2 text-zinc-400">
        <span>{label}</span>
        <span className="font-mono text-xs text-zinc-300">{valueLabel}</span>
      </div>
      <input
        type="range"
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-white"
        {...props}
      />
    </label>
  )
}
