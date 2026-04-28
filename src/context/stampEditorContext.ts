import { createContext } from 'react'

import type { StampCanvasApi } from '../types/canvas'

export type StampDimensions = { width: number; height: number }

export type StampEditorContextValue = {
  register: (api: StampCanvasApi) => void
  unregister: () => void
  stampDimensions: StampDimensions
  perforationCount: number
  setPerforationCount: (n: number) => void
  stampColor: string
  setStampColor: (color: string) => void
  exportPng: (multiplier?: number) => void
  exportJpeg: (options?: { multiplier?: number; quality?: number }) => void
  exportSvg: () => void
}

export const StampEditorContext =
  createContext<StampEditorContextValue | null>(null)
