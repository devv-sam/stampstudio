import {
  FlutedGlass,
  HalftoneCmyk,
  HalftoneDots,
  ImageDithering,
  PaperTexture,
  ShaderMount,
  Water,
  getShaderColorFromString,
} from '@paper-design/shaders-react'
import { useId, useMemo } from 'react'

import type { DitheringPresetName, ShaderName, ShaderParamsMap } from '../../types/canvas'
import {
  isMixMode,
  LMS_TO_RGB,
  RGB_TO_LMS,
  type BlendMode,
  type MixMode,
} from '../../utils/blendModes'
import { solidColorDataUrl } from '../../utils/solidColorDataUrl'
import { ENGRAVING_SHADER, INTAGLIO_SHADER, RISO_SHADER } from './printShaders'

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

const colorMatrix = (m: number[][]) =>
  `${m.map((row) => `${row.join(' ')} 0 0`).join(' ')} 0 0 0 1 0`

const gamma = (exponent: number) => (
  <feComponentTransfer>
    <feFuncR type="gamma" exponent={exponent} />
    <feFuncG type="gamma" exponent={exponent} />
    <feFuncB type="gamma" exponent={exponent} />
  </feComponentTransfer>
)

// css has no color space blends, so filters run the mix. they work in linear rgb by default
function MixFilter({
  id,
  mode,
  fill,
  width,
  height,
}: {
  id: string
  mode: MixMode
  fill: string
  width: number
  height: number
}) {
  const oklab = mode === 'oklab'
  return (
    <svg aria-hidden className="absolute h-0 w-0">
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feImage
          href={fill}
          x="0"
          y="0"
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid slice"
          result="fill"
        />
        {oklab ? (
          <>
            <feColorMatrix in="fill" values={colorMatrix(RGB_TO_LMS)} />
            {gamma(1 / 3)}
            <feOffset result="base" />
            <feColorMatrix in="SourceGraphic" values={colorMatrix(RGB_TO_LMS)} />
            {gamma(1 / 3)}
            <feComposite in2="base" operator="arithmetic" k2={0.5} k3={0.5} />
            {gamma(3)}
            <feColorMatrix values={colorMatrix(LMS_TO_RGB)} />
          </>
        ) : (
          <feComposite
            in="SourceGraphic"
            in2="fill"
            operator="arithmetic"
            k2={0.5}
            k3={0.5}
          />
        )}
      </filter>
    </svg>
  )
}

export function ShaderLayer({
  rect,
  imageSrc,
  stampColor,
  activeShader,
  shaderParams,
  blendMode = 'normal',
  opacity = 1,
}: {
  rect: RectBounds | null
  imageSrc: string
  stampColor: string
  activeShader: ShaderName | null
  shaderParams: ShaderParamsMap
  blendMode?: BlendMode
  opacity?: number
}) {
  const filterId = useId()
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
        opacity,
      }}
    >
      {blendMode === 'normal' ? null : (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${baseImage}")` }}
        />
      )}
      {isMixMode(blendMode) ? (
        <MixFilter
          id={filterId}
          mode={blendMode}
          fill={baseImage}
          width={w}
          height={h}
        />
      ) : null}
      <div
        className="absolute inset-0"
        style={
          isMixMode(blendMode)
            ? { filter: `url("#${filterId}")` }
            : { mixBlendMode: blendMode }
        }
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
        // the waves pull the image past its edges, the zoom keeps that out of frame
        <Water
          {...common}
          fit="cover"
          scale={1.1}
          colorBack={stampColor}
          {...shaderParams.water}
        />
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
      {activeShader === 'intaglio' ? (
        <ShaderMount
          className={common.className}
          speed={0}
          fragmentShader={INTAGLIO_SHADER}
          uniforms={{
            ...printSizing,
            u_image: baseImage,
            u_size: shaderParams.intaglio.size,
            u_contrast: shaderParams.intaglio.contrast,
            u_ink: getShaderColorFromString(shaderParams.intaglio.ink),
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
    </div>
  )
}
