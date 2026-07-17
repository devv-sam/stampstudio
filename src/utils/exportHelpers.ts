import type { Canvas, Group } from 'fabric'

import { getStampBoundsOnCanvas } from './fabricHelpers'
import { loadHtmlImage } from './imageHelpers'
import { computePerforationLayout } from './stampPerforationLayout'

const CANVAS_BG = '#141416'

// ────────────────────────────────────────────────────────────────────────────
// File downloads
// ────────────────────────────────────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.rel = 'noopener'
  a.click()
}

export function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  downloadBlob(blob, filename)
}

// ────────────────────────────────────────────────────────────────────────────
// Perforation geometry — shared between raster and SVG paths
// ────────────────────────────────────────────────────────────────────────────

function getPerforationGeometry(
  width: number,
  height: number,
  userDensity: number,
) {
  return computePerforationLayout(width, height, userDensity)
}

export function punchPerforationHoles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  perforationCount: number,
) {
  const { hCount, vCount, hSpacing, vSpacing, r } = getPerforationGeometry(
    width,
    height,
    perforationCount,
  )
  if (hCount === 0 && vCount === 0) return

  ctx.save()
  // Punch true alpha holes so PNG exports remain transparent over any backdrop.
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = 'rgba(0, 0, 0, 1)'
  for (let i = 0; i < hCount; i += 1) {
    const cx = hSpacing * (i + 1)
    ctx.beginPath()
    ctx.arc(cx, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, height, r, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < vCount; i += 1) {
    const cy = vSpacing * (i + 1)
    ctx.beginPath()
    ctx.arc(0, cy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(width, cy, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// ────────────────────────────────────────────────────────────────────────────
// Rasterise the live Fabric stamp region
//
// The Fabric Rect's fill (solid color or image-pattern) AND any frame Image
// objects clipped to the stamp are rendered together via Fabric's own
// `toDataURL`. We then punch perforation holes using `destination-out`.
// ────────────────────────────────────────────────────────────────────────────

async function rasteriseStampRegion(
  canvas: Canvas,
  stamp: Group,
  perforationCount: number,
  options: { format: 'png' | 'jpeg'; multiplier: number; quality?: number },
): Promise<string> {
  const { left, top, width, height } = getStampBoundsOnCanvas(canvas, stamp)
  canvas.discardActiveObject()
  canvas.requestRenderAll()

  const fabricSnapshot = canvas.toDataURL({
    format: options.format,
    left,
    top,
    width,
    height,
    multiplier: options.multiplier,
    quality: options.quality,
    enableRetinaScaling: false,
  })

  const stampImg = await loadHtmlImage(fabricSnapshot)

  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(width * options.multiplier))
  out.height = Math.max(1, Math.round(height * options.multiplier))
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  if (options.format === 'jpeg') {
    // JPEG has no alpha — fill with the canvas bg first so any potential
    // transparent pixels in the snapshot composite cleanly.
    ctx.fillStyle = CANVAS_BG
    ctx.fillRect(0, 0, out.width, out.height)
  }

  ctx.drawImage(stampImg, 0, 0, out.width, out.height)

  ctx.scale(options.multiplier, options.multiplier)
  punchPerforationHoles(ctx, width, height, perforationCount)

  return out.toDataURL(
    options.format === 'jpeg' ? 'image/jpeg' : 'image/png',
    options.quality,
  )
}

export async function exportStampPng(
  canvas: Canvas,
  stamp: Group,
  multiplier = 2,
  perforationCount = 0,
): Promise<string> {
  return rasteriseStampRegion(canvas, stamp, perforationCount, {
    format: 'png',
    multiplier,
  })
}

export async function exportStampJpeg(
  canvas: Canvas,
  stamp: Group,
  options?: { multiplier?: number; quality?: number },
  perforationCount = 0,
): Promise<string> {
  return rasteriseStampRegion(canvas, stamp, perforationCount, {
    format: 'jpeg',
    multiplier: options?.multiplier ?? 2,
    quality: options?.quality ?? 0.92,
  })
}

// ────────────────────────────────────────────────────────────────────────────
// SVG export
//
// Hybrid approach: the stamp body (which may include a raster background +
// frame images) is rasterised once via Fabric and embedded as a base64
// `<image>`, then perforation circles are layered on top as proper SVG
// shapes. This keeps the file scalable for the perforation geometry while
// preserving image fidelity for user uploads.
// ────────────────────────────────────────────────────────────────────────────

export async function exportStampSvg(
  canvas: Canvas,
  stamp: Group,
  perforationCount = 0,
): Promise<string> {
  const { left, top, width, height } = getStampBoundsOnCanvas(canvas, stamp)
  canvas.discardActiveObject()
  canvas.requestRenderAll()

  const bodyHref = canvas.toDataURL({
    format: 'png',
    left,
    top,
    width,
    height,
    multiplier: 2,
    enableRetinaScaling: false,
  })

  const { hCount, vCount, hSpacing, vSpacing, r } = getPerforationGeometry(
    width,
    height,
    perforationCount,
  )

  const circles: string[] = []
  for (let i = 0; i < hCount; i += 1) {
    const cx = hSpacing * (i + 1)
    circles.push(
      `<circle cx="${cx}" cy="0" r="${r}" fill="${CANVAS_BG}" />`,
      `<circle cx="${cx}" cy="${height}" r="${r}" fill="${CANVAS_BG}" />`,
    )
  }
  for (let i = 0; i < vCount; i += 1) {
    const cy = vSpacing * (i + 1)
    circles.push(
      `<circle cx="0" cy="${cy}" r="${r}" fill="${CANVAS_BG}" />`,
      `<circle cx="${width}" cy="${cy}" r="${r}" fill="${CANVAS_BG}" />`,
    )
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="${bodyHref}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" />
  ${circles.join('\n  ')}
</svg>`
}
