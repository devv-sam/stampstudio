import defaultStampUrl from '../assets/default-stamp.svg'
import type { ShaderParamsMap } from '../types/canvas'

export { defaultStampUrl }

export const DEFAULT_SHADER_PARAMS: ShaderParamsMap = {
  'halftone-dots': { size: 0.5, type: 'gooey', contrast: 0.4 },
  'fluted-glass': { size: 0.5, distortion: 0.5, shape: 'lines' },
  'halftone-cmyk': {
    size: 0.2,
    type: 'ink',
    softness: 1,
    colorBack: '#fbfaf5',
    colorC: '#00b4ff',
    colorM: '#fc519f',
    colorY: '#ffd800',
    colorK: '#231f20',
  },
  'image-dithering': { preset: 'natural', size: 2 },
  'paper-texture': { folds: 0.65, crumples: 0.3, roughness: 0.4 },
  water: { size: 1, waves: 0.3, caustic: 0.1 },
  engraving: { size: 5, angle: 35 },
  // origin sits just above center, where the ripple always started before it moved
  intaglio: { size: 2.5, contrast: 0.3, ink: '#1b1b1f', originX: 0.5, originY: 0.45 },
  riso: { size: 1.5, offset: 0.006 },
}
