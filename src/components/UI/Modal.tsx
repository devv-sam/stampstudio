import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'

/**
 * Lightweight modal primitive — overlay + centred panel + escape-to-close.
 *
 * Animation matches the resize-chrome timing for visual cohesion.
 */
export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  panelClassName = '',
  animatePanel = true,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  labelledBy?: string
  panelClassName?: string
  /** When false, only the backdrop fades — panel appears instantly (no scale/slide). */
  animatePanel?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="modal-root"
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={animatePanel ? { opacity: 0, scale: 0.98, y: 6 } : false}
            animate={animatePanel ? { opacity: 1, scale: 1, y: 0 } : { opacity: 1 }}
            exit={animatePanel ? { opacity: 0, scale: 0.98, y: 4 } : { opacity: 0 }}
            transition={{ duration: animatePanel ? 0.18 : 0, ease: [0.22, 1, 0.36, 1] }}
            className={`relative z-10 flex max-h-[90vh] w-[min(640px,92vw)] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#101010] shadow-2xl ${panelClassName}`}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
