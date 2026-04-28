import { useContext } from 'react'

import { StampEditorContext } from '../context/stampEditorContext'

export type { StampDimensions } from '../context/stampEditorContext'

export function useStampEditor() {
  const ctx = useContext(StampEditorContext)
  if (!ctx) {
    throw new Error('useStampEditor must be used within StampEditorProvider')
  }
  return ctx
}
