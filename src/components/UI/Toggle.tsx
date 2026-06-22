interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  'aria-label'?: string
}

export function Toggle({ checked, onChange, disabled, 'aria-label': ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border p-px transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'border-zinc-400 bg-zinc-200' : 'border-zinc-700 bg-zinc-950'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full shadow-sm ring-1 ring-black/15 transition-transform duration-200 ${
          checked ? 'translate-x-[18px] bg-zinc-900' : 'translate-x-[2px] bg-zinc-400'
        }`}
      />
    </button>
  )
}
