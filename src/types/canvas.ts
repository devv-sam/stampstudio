import type { Canvas, Group } from 'fabric'

export type StampCanvasApi = {
  canvas: Canvas
  stamp: Group
  /** Set stamp to exact output size (px), clamped to stage. */
  setSize?: (width: number, height: number) => {
    width: number
    height: number
  }
  exportCompositedRaster?: (options: {
    format: 'png' | 'jpeg'
    multiplier: number
    quality?: number
    /** Same density/ratio as the live clip-path perforations. */
    perforationCount: number
  }) => Promise<string | null>
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
  | 'image-dithering'
  | 'paper-texture'
  | 'water'
  | 'engraving'
  | 'intaglio'
  | 'riso'

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

/** Preset names exposed in the dithering UI. 'natural' is the silent default. */
export type DitheringPresetName = 'natural' | 'default' | 'noise' | 'retro'

export type ImageDitheringUiParams = {
  preset: DitheringPresetName
  /** Pixel grid size (0.5 – 20). Overrides the preset's default size. */
  size: number
}

export type ShaderParamsMap = {
  'halftone-dots': HalftoneDotsUiParams
  'fluted-glass': FlutedGlassUiParams
  'halftone-cmyk': HalftoneCmykUiParams
  'image-dithering': ImageDitheringUiParams
  'paper-texture': { folds: number; crumples: number; roughness: number }
  water: { size: number; waves: number; caustic: number }
  engraving: { size: number; angle: number }
  /** origin is where the ripple starts, 0-1 across the layer, y down */
  intaglio: {
    size: number
    contrast: number
    ink: string
    originX: number
    originY: number
  }
  riso: { size: number; offset: number }
}
