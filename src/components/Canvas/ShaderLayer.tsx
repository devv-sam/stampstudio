import {
  FlutedGlass,
  HalftoneCmyk,
  HalftoneDots,
  PaperTexture,
} from '@paper-design/shaders-react'

import type { ShaderName, ShaderParamsMap } from '../../types/canvas'

type RectBounds = { left: number; top: number; width: number; height: number }

export function ShaderLayer({
  rect,
  imageSrc,
  activeShader,
  shaderParams,
}: {
  rect: RectBounds | null
  imageSrc: string
  activeShader: ShaderName | null
  shaderParams: ShaderParamsMap
}) {
  if (!rect || !activeShader) return null

  const w = Math.max(1, rect.width)
  const h = Math.max(1, rect.height)
  const common = {
    className: 'absolute inset-0 h-full w-full',
    image: imageSrc,
    speed: 0,
  } as const

  return (
    <div
      className="pointer-events-none absolute z-10 overflow-hidden"
      style={{
        left: rect.left,
        top: rect.top,
        width: w,
        height: h,
      }}
    >
      {activeShader === 'halftone-dots' ? (
        <HalftoneDots
          {...common}
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
          colorBack={shaderParams['halftone-cmyk'].colorBack}
          colorC={shaderParams['halftone-cmyk'].colorC}
          colorM={shaderParams['halftone-cmyk'].colorM}
          colorY={shaderParams['halftone-cmyk'].colorY}
          colorK={shaderParams['halftone-cmyk'].colorK}
        />
      ) : null}
      {activeShader === 'paper-texture' ? (
        <PaperTexture
          {...common}
          roughness={shaderParams['paper-texture'].roughness}
          crumples={shaderParams['paper-texture'].crumples}
          folds={shaderParams['paper-texture'].folds}
          seed={shaderParams['paper-texture'].seed}
        />
      ) : null}
    </div>
  )
}
