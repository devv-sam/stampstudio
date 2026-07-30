import { createContext } from 'react'

/** The set of experiments. Only `stampsheet` is live today. */
export type ExperimentId = 'stampsheet'

export interface ExperimentsContextValue {
  /** Whether the experiments chooser modal is open. */
  modalOpen: boolean
  openModal: () => void
  closeModal: () => void
  /** The experiment currently expanded full-screen (null = none). */
  active: ExperimentId | null
  /** Close the modal and expand an experiment to fill the screen. */
  launch: (id: ExperimentId) => void
  /** Leave the active experiment, returning to the studio. */
  exit: () => void
}

export const ExperimentsContext = createContext<ExperimentsContextValue | null>(
  null,
)
