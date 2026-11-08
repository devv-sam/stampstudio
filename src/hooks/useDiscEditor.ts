import { useContext } from 'react'

import { DiscEditorContext } from '../context/discEditorContext'

export function useDiscEditor() {
  const ctx = useContext(DiscEditorContext)
  if (!ctx) {
    throw new Error('useDiscEditor must be used within a DiscEditorProvider')
  }
  return ctx
}
