import {
  DISC_TEXT_SCALE,
  discGeometry,
  fitted,
  isStraight,
  straightLines,
  trackLines,
  type DiscTextItem,
} from './discText'

// the noise preset reads too heavy on a disc, so it runs at 75%
export const NOISE_OPACITY = 0.75

// what the paper shader mount exposes for re-rendering at export size
type ShaderRenderer = {
  setMaxPixelCount: (count?: number) => void
  setMinPixelRatio: (ratio?: number) => void
}

export type DiscExportState = {
  hole: number
  rings: number
  spread: number
  color: string
  image: string | null
  texts: DiscTextItem[]
  /** shader layer opacity, the noise preset runs below 1 */
  shaderOpacity: number
}

const loadImage = async (src: string) => {
  const img = new Image()
  img.src = src
  await img.decode()
  return img
}

/** the disc ring as a clip: outer circle minus the hole */
function ringPath(ctx: CanvasRenderingContext2D, size: number, holePct: number) {
  const c = size / 2
  ctx.beginPath()
  ctx.arc(c, c, c, 0, Math.PI * 2)
  ctx.moveTo(c + (size * holePct) / 200, c)
  ctx.arc(c, c, (size * holePct) / 200, 0, Math.PI * 2)
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, size: number) {
  const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight)
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
}

/** draws one text item the way DiscText lays it out, k = px per svg unit */
function drawText(
  ctx: CanvasRenderingContext2D,
  item: DiscTextItem,
  geo: ReturnType<typeof discGeometry>,
  k: number,
) {
  const t = fitted(item, geo)
  ctx.save()
  ctx.fillStyle = t.color
  const px = (t.fontSize / DISC_TEXT_SCALE) * k
  ctx.font = `${t.fontWeight} ${px}px '${t.fontFamily}'`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (isStraight(t.slot)) {
    for (const line of straightLines(t, geo.anchors[t.slot])) {
      ctx.textAlign =
        line.textAnchor === 'start' ? 'left' : line.textAnchor === 'end' ? 'right' : 'center'
      ctx.fillText(line.text, line.x * k, line.y * k)
    }
    ctx.restore()
    return
  }

  // tracks: letter by letter along each line's arc, 0.06em apart like the on-screen textPath
  const c = 50 * k
  const gap = 0.06 * px
  const center = (t.angle * Math.PI) / 180
  // the bottom half runs counter-clockwise so it reads upright
  const flip = Math.cos(center) < 0
  const dir = flip ? -1 : 1

  for (const line of trackLines(t, geo.tracks[t.slot])) {
    const r = line.r * k
    const chars = [...line.text]
    const widths = chars.map((ch) => ctx.measureText(ch).width)
    const total = widths.reduce((sum, w) => sum + w + gap, 0) - gap
    let at = center - (dir * total) / 2 / r

    chars.forEach((ch, i) => {
      const mid = at + (dir * widths[i]! / 2) / r
      ctx.save()
      ctx.translate(c + r * Math.sin(mid), c - r * Math.cos(mid))
      ctx.rotate(flip ? mid + Math.PI : mid)
      ctx.fillText(ch, 0, 0)
      ctx.restore()
      at += (dir * (widths[i]! + gap)) / r
    })
  }
  ctx.restore()
}

/**
 * paints the disc at `size` px square. `preview` is the on-screen disc,
 * its shader canvas gets re-rendered at export size and multiplied in.
 */
export async function renderDisc(
  preview: HTMLElement,
  state: DiscExportState,
  size: number,
) {
  const out = document.createElement('canvas')
  out.width = size
  out.height = size
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')

  // everything async happens first, the webgl buffer can clear after a frame ends
  const img = state.image ? await loadImage(state.image) : null
  await document.fonts.ready

  ctx.save()
  ringPath(ctx, size, state.hole)
  ctx.clip('evenodd')

  ctx.fillStyle = state.color
  ctx.fillRect(0, 0, size, size)
  if (img) drawCover(ctx, img, size)

  const shader = preview.querySelector('canvas')
  const mount = (shader?.parentElement as (HTMLElement & { paperShaderMount?: ShaderRenderer }) | null)
    ?.paperShaderMount
  if (shader && mount && shader.width > 0) {
    // the on-screen shader is sized for the screen, so render it again at the export size
    mount.setMaxPixelCount(size * size)
    mount.setMinPixelRatio(size / preview.clientWidth)
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = state.shaderOpacity
    ctx.drawImage(shader, 0, 0, size, size)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    mount.setMinPixelRatio()
    mount.setMaxPixelCount()
  }

  const k = size / 100
  const geo = discGeometry(state.hole, state.rings, state.spread)

  // rings: a dark groove with a faint lit edge, 1 screen px scaled up
  const line = Math.max(1, size / preview.clientWidth)
  for (let i = 1; i <= state.rings; i++) {
    const r = state.hole / 2 + state.spread * i
    if (r >= 49) break
    ctx.lineWidth = line
    ctx.strokeStyle = 'rgb(0 0 0 / 0.35)'
    ctx.beginPath()
    ctx.arc(50 * k, 50 * k, r * k, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgb(255 255 255 / 0.12)'
    ctx.beginPath()
    ctx.arc(50 * k, 50 * k, (r + 0.25) * k, 0, Math.PI * 2)
    ctx.stroke()
  }

  for (const t of state.texts) drawText(ctx, t, geo, k)
  ctx.restore()

  return out
}

/** svg with the disc edge and hole kept as a vector cut around a raster body */
export function discSvg(png: string, size: number, holePct: number) {
  const c = size / 2
  const h = (size * holePct) / 200
  const d = `M ${c - c} ${c} a ${c} ${c} 0 1 0 ${size} 0 a ${c} ${c} 0 1 0 ${-size} 0 Z M ${c - h} ${c} a ${h} ${h} 0 1 0 ${h * 2} 0 a ${h} ${h} 0 1 0 ${-h * 2} 0 Z`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><clipPath id="disc"><path fill-rule="evenodd" clip-rule="evenodd" d="${d}"/></clipPath></defs>
  <image width="${size}" height="${size}" clip-path="url(#disc)" href="${png}"/>
</svg>`
}
