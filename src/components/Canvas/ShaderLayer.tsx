import {
  FlutedGlass,
  HalftoneCmyk,
  HalftoneDots,
  ImageDithering,
  PaperTexture,
  ShaderMount,
  Water,
} from '@paper-design/shaders-react'
import { useMemo } from 'react'

import type { DitheringPresetName, ShaderName, ShaderParamsMap } from '../../types/canvas'
import { solidColorDataUrl } from '../../utils/solidColorDataUrl'
import { ENGRAVING_SHADER, RISO_SHADER } from './printShaders'

const COVER = 2
const printSizing = {
  u_fit: COVER,
  u_scale: 1,
  u_rotation: 0,
  u_offsetX: 0,
  u_offsetY: 0,
  u_originX: 0.5,
  u_originY: 0.5,
  u_worldWidth: 0,
  u_worldHeight: 0,
}

const DITHERING_PRESETS: Record<
  DitheringPresetName,
  {
    colorFront: string
    colorBack: string
    colorHighlight: string
    type: 'random' | '2x2' | '4x4' | '8x8'
    size: number
    colorSteps: number
    originalColors: boolean
    inverted: boolean
  }
> = {
  natural: {
    colorFront: '#ffffff',
    colorBack: '#000000',
    colorHighlight: '#ffffff',
    type: '8x8',
    size: 2,
    colorSteps: 5,
    originalColors: true,
    inverted: false,
  },
  default: {
    colorFront: '#94ffaf',
    colorBack: '#000c38',
    colorHighlight: '#eaff94',
    type: '8x8',
    size: 2,
    colorSteps: 2,
    originalColors: false,
    inverted: false,
  },
  noise: {
    colorFront: '#a2997c',
    colorBack: '#000000',
    colorHighlight: '#ededed',
    type: 'random',
    size: 1,
    colorSteps: 1,
    originalColors: false,
    inverted: false,
  },
  retro: {
    colorFront: '#eeeeee',
    colorBack: '#5452ff',
    colorHighlight: '#eeeeee',
    type: '2x2',
    size: 3,
    colorSteps: 1,
    originalColors: true,
    inverted: false,
  },
}

type RectBounds = { left: number; top: number; width: number; height: number }

export function ShaderLayer({
  rect,
  imageSrc,
  stampColor,
  activeShader,
  shaderParams,
}: {
  rect: RectBounds | null
  imageSrc: string
  stampColor: string
  activeShader: ShaderName | null
  shaderParams: ShaderParamsMap
}) {
  const hasPhotoFill = imageSrc.trim().length > 0
  const baseImage = useMemo(
    () => (hasPhotoFill ? imageSrc : solidColorDataUrl(stampColor)),
    [hasPhotoFill, imageSrc, stampColor],
  )

  if (!rect || !activeShader) return null

  const w = Math.max(1, rect.width)
  const h = Math.max(1, rect.height)

  const common = {
    className: 'absolute inset-0 h-full w-full',
    image: baseImage,
    speed: 0,
  } as const

  return (
    <div
      className="pointer-events-none absolute z-30 overflow-hidden"
      style={{
        left: rect.left,
        top: rect.top,
        width: w,
        height: h,
        mixBlendMode: 'multiply',
      }}
    >
      {activeShader === 'halftone-dots' ? (
        <HalftoneDots
          {...common}
          {...(!hasPhotoFill ? { colorBack: stampColor } : {})}
          size={shaderParams['halftone-dots'].size}
          type={shaderParams['halftone-dots'].type}
          contrast={shaderParams['halftone-dots'].contrast}
        />
      ) : null}
      {activeShader === 'fluted-glass' ? (
        <FlutedGlass
          {...common}
          size={shaderParams['fluted-glass'].size}
          distortion={shaderParams['fluted-glass'].distortion}
          shape={shaderParams['fluted-glass'].shape}
        />
      ) : null}
      {activeShader === 'halftone-cmyk' ? (
        <HalftoneCmyk
          {...common}
          size={shaderParams['halftone-cmyk'].size}
          type={shaderParams['halftone-cmyk'].type}
          softness={shaderParams['halftone-cmyk'].softness}
          colorBack={
            hasPhotoFill
              ? shaderParams['halftone-cmyk'].colorBack
              : stampColor
          }
          colorC={shaderParams['halftone-cmyk'].colorC}
          colorM={shaderParams['halftone-cmyk'].colorM}
          colorY={shaderParams['halftone-cmyk'].colorY}
          colorK={shaderParams['halftone-cmyk'].colorK}
        />
      ) : null}
      {activeShader === 'image-dithering' ? (
        <ImageDithering
          {...common}
          {...DITHERING_PRESETS[shaderParams['image-dithering'].preset]}
          size={shaderParams['image-dithering'].size}
        />
      ) : null}
      {activeShader === 'paper-texture' ? (
        <PaperTexture
          {...common}
          fit="cover"
          scale={1}
          {...shaderParams['paper-texture']}
        />
      ) : null}
      {activeShader === 'water' ? (
        <Water {...common} fit="cover" scale={1} {...shaderParams.water} />
      ) : null}
      {activeShader === 'engraving' ? (
        <ShaderMount
          className={common.className}
          speed={0}
          fragmentShader={ENGRAVING_SHADER}
          uniforms={{
            ...printSizing,
            u_image: baseImage,
            u_size: shaderParams.engraving.size,
            u_angle: shaderParams.engraving.angle,
          }}
        />
      ) : null}
      {activeShader === 'riso' ? (
        <ShaderMount
          className={common.className}
          speed={0}
          fragmentShader={RISO_SHADER}
          uniforms={{
            ...printSizing,
            u_image: baseImage,
            u_size: shaderParams.riso.size,
            u_offset: shaderParams.riso.offset,
          }}
        />
      ) : null}
    </div>
  )
}
