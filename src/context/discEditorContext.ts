import { createContext, type RefObject } from 'react'

import type { DiscFrameItem, DiscTextItem } from '../utils/discText'

/** what the crop step is open for: the disc's image, a new frame, or recropping one */
export type DiscCrop =
  | { kind: 'image'; src: string }
  | { kind: 'frame'; src: string; frameId: string | null }

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
  /** the upload waiting in the crop step */
  crop: DiscCrop | null
  /** an upload for the disc's background image */
  startCrop: (file: File) => void
  /** an upload for a new frame */
  startFrameCrop: (file: File) => Promise<void>
  /** reopens the crop step on a frame's original upload */
  recropFrame: (id: string) => void
  closeCrop: () => void
  /** places the crop: the disc image, a new frame, or a recropped one. new images also go to the library */
  applyCrop: (src: string, width: number, height: number) => void

  texts: DiscTextItem[]
  setTexts: (texts: DiscTextItem[]) => void
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  addText: () => void
  updateSelected: (patch: Partial<DiscTextItem>) => void
  /** removes the selected text or frame */
  removeSelected: () => void

  /** images placed freely, drawn under the text. selection is shared with text */
  frames: DiscFrameItem[]
  setFrames: (frames: DiscFrameItem[]) => void

  /** the on-screen disc, export re-renders its shader from here */
  previewRef: RefObject<HTMLDivElement | null>
  /** size is the exported square in px */
  exportPng: (size: number) => Promise<void>
  copyPng: (size: number) => Promise<void>
  exportSvg: () => Promise<void>
  copySvg: () => Promise<void>
}

export const DiscEditorContext = createContext<DiscEditorContextValue | null>(
  null,
)
