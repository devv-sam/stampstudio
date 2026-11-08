import { createContext } from 'react'

/** The set of experiments. `cd` is the disc designer. */
export type ExperimentId = 'stampsheet' | 'cd'

export interface ExperimentsContextValue {
  /** The experiment currently expanded full-screen (null = none). */
  active: ExperimentId | null
  /** Expand an experiment to fill the screen. */
  launch: (id: ExperimentId) => void
  /** Leave the active experiment, returning to the studio. */
  exit: () => void
}

export const ExperimentsContext = createContext<ExperimentsContextValue | null>(
  null,
)
