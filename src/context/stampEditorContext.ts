import { createContext } from 'react'

import type {
  StampCanvasApi,
  ShaderName,
  ShaderParamsMap,
} from '../types/canvas'
import type { ImageAsset } from '../types/assets'
import type { TextLayer } from '../types/text'

export type StampDimensions = { width: number; height: number }

export type StampEditorContextValue = {
  register: (api: StampCanvasApi) => void
  unregister: () => void
  stampDimensions: StampDimensions
  perforationCount: number
  setPerforationCount: (n: number) => void
  stampColor: string
  setStampColor: (color: string) => void
  /**
   * Pick solid background color — demotes any image background first so solid
   * fill always wins atomically with image-or-color mutual exclusivity.
   */
  pickSolidStampColor: (color: string) => Promise<void>

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
    fileName?: string
    originalSrc?: string
  }) => Promise<void>
  /** Update crop/source dimensions for an existing image asset by id. */
  updateImageAsset: (
    id: string,
    params: {
      src: string
      width: number
      height: number
      fileName?: string
      originalSrc?: string
    },
  ) => Promise<void>
  /** Re-role an existing asset (frame ↔ background ↔ unused). */
  setAssetRole: (id: string, role: ImageAsset['role']) => Promise<void>
  removeAsset: (id: string) => Promise<void>
  /** Clear the current background (revert to solid `stampColor`). */
  clearBackground: () => Promise<void>

  /** Text layers on the stamp (Fabric-backed). */
  textLayers: TextLayer[]
  selectedTextId: string | null
  setSelectedTextId: (id: string | null) => void
  /** Press T or the text tool, then click the stamp canvas to append a layer. */
  textPlacementActive: boolean
  setTextPlacementActive: (active: boolean) => void
  toggleTextPlacementActive: () => void
  addTextLayerAtScene: (sceneX: number, sceneY: number) => void
  updateTextLayer: (
    id: string,
    patch: Partial<TextLayer>,
    options?: { syncToFabric?: boolean },
  ) => void
  removeTextLayer: (id: string) => void

  exportPng: (multiplier?: number) => Promise<void>
  exportJpeg: (options?: { multiplier?: number; quality?: number }) => Promise<void>
  exportSvg: () => Promise<void>

  /** Shader applied on the stamp (`null` = normal fill only). Separate from accordion open state in the panel. */
  activeShader: ShaderName | null
  setActiveShader: (name: ShaderName | null) => void
  shaderParams: ShaderParamsMap
  updateShaderParam: <K extends ShaderName>(
    shader: K,
    param: keyof ShaderParamsMap[K],
    value: ShaderParamsMap[K][keyof ShaderParamsMap[K]],
  ) => void
}

export type { ShaderName, ShaderParamsMap }

export const StampEditorContext =
  createContext<StampEditorContextValue | null>(null)
