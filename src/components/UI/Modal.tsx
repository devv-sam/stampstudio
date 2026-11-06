import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'

import { useDeskMotion } from '../../utils/deskMotion'

/**
 * Lightweight modal primitive — overlay + centred panel + escape-to-close.
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
  const { blurPop } = useDeskMotion()

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
            className="absolute inset-0 bg-desk/70 backdrop-blur-md"
          />
          <motion.div
            {...(animatePanel ? blurPop : {})}
            className={`desk-card relative z-10 flex max-h-[90vh] w-[min(560px,92vw)] flex-col overflow-y-auto ${panelClassName}`}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
