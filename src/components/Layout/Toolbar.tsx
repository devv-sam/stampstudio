import { Button } from '../UI/Button'

export function Toolbar() {
  return (
    <div className="pointer-events-auto flex flex-col gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/90 p-3 shadow-xl backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Quick
      </p>
      <Button variant="ghost" className="justify-start px-2 py-1.5 text-xs" disabled>
        Grid (soon)
      </Button>
      <Button variant="ghost" className="justify-start px-2 py-1.5 text-xs" disabled>
        Snap (soon)
      </Button>
    </div>
  )
}
