import { useCallback, useMemo, useState, type ReactNode } from 'react'

import {
  ExperimentsContext,
  type ExperimentId,
  type ExperimentsContextValue,
} from './experimentsContext'

/**
 * Owns the "Experiments" surface state — whether the chooser modal is open and
 * which experiment (if any) is expanded to fill the screen. Kept separate from
 * the (large) StampEditorProvider so the launcher button and the full-screen
 * surface can share state without prop-drilling, and the studio stays unaware.
 */
export function ExperimentsProvider({ children }: { children: ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [active, setActive] = useState<ExperimentId | null>(null)

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])
  const launch = useCallback((id: ExperimentId) => {
    setModalOpen(false)
    setActive(id)
  }, [])
  const exit = useCallback(() => setActive(null), [])

  const value = useMemo<ExperimentsContextValue>(
    () => ({ modalOpen, openModal, closeModal, active, launch, exit }),
    [modalOpen, openModal, closeModal, active, launch, exit],
  )

  return (
    <ExperimentsContext.Provider value={value}>
      {children}
    </ExperimentsContext.Provider>
  )
}
