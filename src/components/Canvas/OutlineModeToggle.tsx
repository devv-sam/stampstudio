import { Scan } from 'lucide-react'
import { useEffect } from 'react'

import { useStampEditor } from '../../hooks/useStampEditor'

export function OutlineModeToggle() {
  const { outlineMode, toggleOutlineMode } = useStampEditor()

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
    <button
      type="button"
      onClick={toggleOutlineMode}
      aria-pressed={outlineMode}
      aria-label={outlineMode ? 'Exit outline mode' : 'Outline mode'}
      title={outlineMode ? 'Exit outline mode (⌘Y)' : 'Outline mode (⌘Y)'}
      className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
        outlineMode
          ? 'border-white/30 bg-white/10 text-white'
          : 'border-transparent bg-zinc-900/60 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800/80 hover:text-zinc-300'
      }`}
    >
      <Scan className="h-3.5 w-3.5" strokeWidth={1.75} />
    </button>
  )
}
