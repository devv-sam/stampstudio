export const BLEND_MODES = [
  { value: 'normal', label: 'Normal' },
  { value: 'linear', label: 'Linear' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'oklab', label: 'Oklab' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'darken', label: 'Darken' },
] as const

export type BlendMode = (typeof BLEND_MODES)[number]['value']

/** Even mixes in a color space. Every other mode is a native css and canvas blend. */
export type MixMode = Extract<BlendMode, 'linear' | 'oklab'>

export const isMixMode = (mode: BlendMode): mode is MixMode =>
  mode === 'linear' || mode === 'oklab'

export const RGB_TO_LMS = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
]

export const LMS_TO_RGB = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
]

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4

const toSrgb = (c: number) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055

const LINEAR = Array.from({ length: 256 }, (_, i) => toLinear(i / 255))

const apply = (m: number[][], [a, b, c]: number[]) =>
  m.map((row) => row[0]! * a! + row[1]! * b! + row[2]! * c!)

/** Mixes two opaque rgba buffers half and half into `base`. */
export function mixPixels(
  base: Uint8ClampedArray,
  top: Uint8ClampedArray,
  mode: MixMode,
) {
  const read = (px: Uint8ClampedArray, i: number) => {
    const rgb = [LINEAR[px[i]!]!, LINEAR[px[i + 1]!]!, LINEAR[px[i + 2]!]!]
    return mode === 'oklab' ? apply(RGB_TO_LMS, rgb).map(Math.cbrt) : rgb
  }

  for (let i = 0; i < base.length; i += 4) {
    const a = read(base, i)
    const b = read(top, i)
    const mixed = a.map((v, c) => (v + b[c]!) / 2)
    const rgb =
      mode === 'oklab'
        ? apply(LMS_TO_RGB, mixed.map((v) => v ** 3))
        : mixed
    for (let c = 0; c < 3; c += 1) {
      base[i + c] = toSrgb(Math.min(1, Math.max(0, rgb[c]!))) * 255
    }
  }
}

function canvasLike(source: HTMLCanvasElement) {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  return { canvas, ctx: canvas.getContext('2d', { willReadFrequently: true })! }
}

/** Export twin of what ShaderLayer shows: the shader blended over the stamp fill. */
export async function blendShaderOverFill(
  shader: HTMLCanvasElement,
  fillSrc: string,
  mode: BlendMode,
) {
  if (mode === 'normal') return shader

  // copied before the await, a webgl buffer can clear once the frame ends
  const shaderCopy = canvasLike(shader)
  shaderCopy.ctx.drawImage(shader, 0, 0)

  const fill = new Image()
  fill.src = fillSrc
  await fill.decode()

  const { width, height } = shader
  const cover = Math.max(width / fill.width, height / fill.height)
  const drawFill = (ctx: CanvasRenderingContext2D) =>
    ctx.drawImage(
      fill,
      (width - fill.width * cover) / 2,
      (height - fill.height * cover) / 2,
      fill.width * cover,
      fill.height * cover,
    )

  const out = canvasLike(shader)
  drawFill(out.ctx)

  if (!isMixMode(mode)) {
    out.ctx.globalCompositeOperation = mode
    out.ctx.drawImage(shaderCopy.canvas, 0, 0)
    return out.canvas
  }

  const top = canvasLike(shader)
  drawFill(top.ctx)
  top.ctx.drawImage(shaderCopy.canvas, 0, 0)

  const pixels = out.ctx.getImageData(0, 0, width, height)
  mixPixels(
    pixels.data,
    top.ctx.getImageData(0, 0, width, height).data,
    mode,
  )
  out.ctx.putImageData(pixels, 0, 0)
  return out.canvas
}
