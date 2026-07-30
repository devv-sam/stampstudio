import { useContext } from 'react'

import { ExperimentsContext } from '../context/experimentsContext'

export function useExperiments() {
  const ctx = useContext(ExperimentsContext)
  if (!ctx) {
    throw new Error('useExperiments must be used within an ExperimentsProvider')
  }
  return ctx
}
