import type { Canvas, Rect } from 'fabric'

import { getStampBoundsOnCanvas } from './fabricHelpers'
import { loadHtmlImage } from './imageHelpers'

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

function getPerforationGeometry(width: number, height: number, count: number) {
  const safeCount = Math.max(0, Math.floor(count))
  const hSpacing = safeCount > 0 ? width / (safeCount + 1) : 0
  const vSpacing = safeCount > 0 ? height / (safeCount + 1) : 0
  const r = safeCount > 0 ? Math.min(hSpacing, vSpacing) * 0.38 : 0
  return { count: safeCount, hSpacing, vSpacing, r }
}

function paintPerforationCircles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  perforationCount: number,
) {
  const { count, hSpacing, vSpacing, r } = getPerforationGeometry(
    width,
    height,
    perforationCount,
  )
  if (count === 0) return

  ctx.fillStyle = CANVAS_BG
  for (let i = 0; i < count; i += 1) {
    const cxTopBottom = hSpacing * (i + 1)
    const cyLeftRight = vSpacing * (i + 1)

    ctx.beginPath()
    ctx.arc(cxTopBottom, 0, r, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(cxTopBottom, height, r, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(0, cyLeftRight, r, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(width, cyLeftRight, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Rasterise the live Fabric stamp region
//
// The Fabric Rect's fill (solid color or image-pattern) AND any frame Image
// objects clipped to the stamp are rendered together via Fabric's own
// `toDataURL`. We then paint perforation holes on top — those holes are
// canvas-bg coloured circles, not real transparency, matching the in-app
// painter's-algorithm rendering exactly.
// ────────────────────────────────────────────────────────────────────────────

async function rasteriseStampRegion(
  canvas: Canvas,
  stamp: Rect,
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
  paintPerforationCircles(ctx, width, height, perforationCount)

  return out.toDataURL(
    options.format === 'jpeg' ? 'image/jpeg' : 'image/png',
    options.quality,
  )
}

export async function exportStampPng(
  canvas: Canvas,
  stamp: Rect,
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
  stamp: Rect,
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
  stamp: Rect,
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

  const { count, hSpacing, vSpacing, r } = getPerforationGeometry(
    width,
    height,
    perforationCount,
  )

  const circles: string[] = []
  for (let i = 0; i < count; i += 1) {
    const cxTopBottom = hSpacing * (i + 1)
    const cyLeftRight = vSpacing * (i + 1)
    circles.push(
      `<circle cx="${cxTopBottom}" cy="0" r="${r}" fill="${CANVAS_BG}" />`,
      `<circle cx="${cxTopBottom}" cy="${height}" r="${r}" fill="${CANVAS_BG}" />`,
      `<circle cx="0" cy="${cyLeftRight}" r="${r}" fill="${CANVAS_BG}" />`,
      `<circle cx="${width}" cy="${cyLeftRight}" r="${r}" fill="${CANVAS_BG}" />`,
    )
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="${bodyHref}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" />
  ${circles.join('\n  ')}
</svg>`
}
