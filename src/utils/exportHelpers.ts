import type { Canvas } from 'fabric'
import type { Rect } from 'fabric'

import { getStampBoundsOnCanvas } from './fabricHelpers'

const CANVAS_BG = '#141416'

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

function getPerforationGeometry(width: number, height: number, count: number) {
  const safeCount = Math.max(0, Math.floor(count))
  const hSpacing = safeCount > 0 ? width / (safeCount + 1) : 0
  const vSpacing = safeCount > 0 ? height / (safeCount + 1) : 0
  const r = safeCount > 0 ? Math.min(hSpacing, vSpacing) * 0.38 : 0
  return { count: safeCount, hSpacing, vSpacing, r }
}

function drawPerforatedStampOnContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fillColor: string,
  perforationCount: number,
) {
  const { count, hSpacing, vSpacing, r } = getPerforationGeometry(
    width,
    height,
    perforationCount,
  )

  ctx.fillStyle = fillColor
  ctx.fillRect(0, 0, width, height)

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

function renderPerforatedStampDataUrl(
  width: number,
  height: number,
  fillColor: string,
  perforationCount: number,
  options: { format: 'png' | 'jpeg'; multiplier: number; quality?: number },
) {
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(width * options.multiplier))
  out.height = Math.max(1, Math.round(height * options.multiplier))
  const ctx = out.getContext('2d')
  if (!ctx) return ''

  ctx.scale(options.multiplier, options.multiplier)
  drawPerforatedStampOnContext(ctx, width, height, fillColor, perforationCount)

  return out.toDataURL(
    options.format === 'jpeg' ? 'image/jpeg' : 'image/png',
    options.quality,
  )
}

export function exportStampPng(
  canvas: Canvas,
  stamp: Rect,
  multiplier = 2,
  perforationCount = 0,
  fillColor = '#ffffff',
) {
  const { width, height } = getStampBoundsOnCanvas(canvas, stamp)
  canvas.discardActiveObject()
  canvas.requestRenderAll()
  return renderPerforatedStampDataUrl(width, height, fillColor, perforationCount, {
    format: 'png',
    multiplier,
  })
}

export function exportStampJpeg(
  canvas: Canvas,
  stamp: Rect,
  options?: { multiplier?: number; quality?: number },
  perforationCount = 0,
  fillColor = '#ffffff',
) {
  const { width, height } = getStampBoundsOnCanvas(canvas, stamp)
  canvas.discardActiveObject()
  canvas.requestRenderAll()
  return renderPerforatedStampDataUrl(width, height, fillColor, perforationCount, {
    format: 'jpeg',
    quality: options?.quality ?? 0.92,
    multiplier: options?.multiplier ?? 2,
  })
}

export function exportStampSvg(
  canvas: Canvas,
  stamp: Rect,
  perforationCount = 0,
  fillColor = '#ffffff',
) {
  const { width, height } = getStampBoundsOnCanvas(canvas, stamp)
  canvas.discardActiveObject()
  canvas.requestRenderAll()

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
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="${fillColor}" />
  ${circles.join('\n  ')}
</svg>`
}
