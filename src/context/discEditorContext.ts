import { createContext } from 'react'

import type { DiscTextItem } from '../utils/discText'

export interface DiscEditorContextValue {
  /** true while the desk shows the disc instead of the stamp */
  discMode: boolean
  setDiscMode: (on: boolean) => void

  size: number
  setSize: (px: number) => void
  /** cutout diameter as a % of the disc diameter */
  hole: number
  setHole: (pct: number) => void
  rings: number
  setRings: (count: number) => void
  /** gap between rings, in % of the disc diameter */
  spread: number
  setSpread: (pct: number) => void

  color: string
  /** image or color, never both: picking a color drops the image */
  image: string | null
  pickColor: (hex: string) => void
  setImage: (src: string | null) => void
  /** the raw upload waiting in the crop step */
  cropSrc: string | null
  startCrop: (file: File) => void
  closeCrop: () => void

  texts: DiscTextItem[]
  setTexts: (texts: DiscTextItem[]) => void
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  addText: () => void
  updateSelected: (patch: Partial<DiscTextItem>) => void
  removeSelected: () => void
}

export const DiscEditorContext = createContext<DiscEditorContextValue | null>(
  null,
)
