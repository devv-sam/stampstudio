import type { Canvas, Group } from 'fabric'

export type StampCanvasApi = {
  canvas: Canvas
  stamp: Group
}

export type StampCanvasRegistration = {
  register: (api: StampCanvasApi) => void
  unregister: () => void
}

/** Paper shaders we expose in the editor (one active at a time). */
export type ShaderName =
  | 'halftone-dots'
  | 'fluted-glass'
  | 'halftone-cmyk'
  | 'paper-texture'

/** Matches @paper-design/shaders HalftoneDotsType */
export type HalftoneDotsStyle = 'classic' | 'gooey' | 'holes' | 'soft'

export type HalftoneDotsUiParams = {
  size: number
  type: HalftoneDotsStyle
  contrast: number
}

/** Matches GlassGridShape subset we expose in UI */
export type FlutedGlassPattern = 'lines' | 'wave' | 'linesIrregular'

export type FlutedGlassUiParams = {
  size: number
  distortion: number
  shape: FlutedGlassPattern
}

/** Matches HalftoneCmykType */
export type HalftoneCmykStyle = 'dots' | 'ink' | 'sharp'

export type HalftoneCmykUiParams = {
  size: number
  type: HalftoneCmykStyle
  softness: number
  colorBack: string
  colorC: string
  colorM: string
  colorY: string
  colorK: string
}

export type PaperTextureUiParams = {
  roughness: number
  crumples: number
  folds: number
  seed: number
}

export type ShaderParamsMap = {
  'halftone-dots': HalftoneDotsUiParams
  'fluted-glass': FlutedGlassUiParams
  'halftone-cmyk': HalftoneCmykUiParams
  'paper-texture': PaperTextureUiParams
}
