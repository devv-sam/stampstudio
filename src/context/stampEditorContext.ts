import { createContext } from 'react'

import type { StampCanvasApi } from '../types/canvas'
import type { ImageAsset } from '../types/assets'

export type StampDimensions = { width: number; height: number }

export type StampEditorContextValue = {
  register: (api: StampCanvasApi) => void
  unregister: () => void
  stampDimensions: StampDimensions
  perforationCount: number
  setPerforationCount: (n: number) => void
  stampColor: string
  setStampColor: (color: string) => void

  /** Full list of uploaded image assets, ordered by upload time. */
  imageAssets: ImageAsset[]
  /** Convenience: the asset currently set as background, if any. */
  backgroundAsset: ImageAsset | null
  /** Convenience: assets currently rendered as frame elements. */
  frameAssets: ImageAsset[]
  /**
   * Add a new (already-cropped) image and place it in the chosen role.
   * If `role === 'background'` and another bg exists, the previous bg is
   * demoted to `'unused'` (kept in the asset list so the user can re-promote
   * it later without re-uploading).
   */
  addImageAsset: (params: {
    src: string
    width: number
    height: number
    role: 'background' | 'frame'
  }) => Promise<void>
  /** Re-role an existing asset (frame ↔ background ↔ unused). */
  setAssetRole: (id: string, role: ImageAsset['role']) => Promise<void>
  removeAsset: (id: string) => Promise<void>
  /** Clear the current background (revert to solid `stampColor`). */
  clearBackground: () => Promise<void>

  exportPng: (multiplier?: number) => Promise<void>
  exportJpeg: (options?: { multiplier?: number; quality?: number }) => Promise<void>
  exportSvg: () => Promise<void>
}

export const StampEditorContext =
  createContext<StampEditorContextValue | null>(null)
