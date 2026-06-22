import { motion } from 'framer-motion'
import { Scan } from 'lucide-react'
import { useEffect } from 'react'

import { useStampEditor } from '../../hooks/useStampEditor'

export function OutlineModeToggle() {
  const { outlineMode, setOutlineMode, toggleOutlineMode } = useStampEditor()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'y') return
      const target = e.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return
      }
      e.preventDefault()
      toggleOutlineMode()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleOutlineMode])

  return (
    <div
      className="flex select-none items-center gap-2 rounded-md bg-zinc-900/60 px-2 py-1"
      title="Wireframe view of stamp layers (⌘Y)"
    >
      <Scan
        className={`h-3 w-3 shrink-0 transition-colors ${
          outlineMode ? 'text-white' : 'text-zinc-500'
        }`}
        strokeWidth={1.75}
        aria-hidden
      />
      <span
        className={`text-[10px] font-medium tracking-tight transition-colors ${
          outlineMode ? 'text-zinc-200' : 'text-zinc-500'
        }`}
      >
        Outline
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={outlineMode}
        aria-label="Outline mode"
        onClick={() => setOutlineMode(!outlineMode)}
        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border p-px transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400/60 ${
          outlineMode
            ? 'border-zinc-400 bg-zinc-200'
            : 'border-zinc-700 bg-zinc-950'
        }`}
      >
        <motion.span
          aria-hidden
          className={`pointer-events-none block h-2.5 w-2.5 rounded-full shadow-sm ring-1 ring-black/15 ${
            outlineMode ? 'bg-zinc-900' : 'bg-zinc-400'
          }`}
          animate={{ x: outlineMode ? 11 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        />
      </button>
    </div>
  )
}
