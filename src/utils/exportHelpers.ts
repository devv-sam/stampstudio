import type { Canvas } from 'fabric'
import type { Rect } from 'fabric'

import { getStampBoundsOnCanvas } from './fabricHelpers'

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

export function exportStampPng(canvas: Canvas, stamp: Rect, multiplier = 2) {
  const { left, top, width, height } = getStampBoundsOnCanvas(canvas, stamp)
  canvas.discardActiveObject()
  canvas.requestRenderAll()
  return canvas.toDataURL({
    format: 'png',
    multiplier,
    left,
    top,
    width,
    height,
  })
}

export function exportStampJpeg(
  canvas: Canvas,
  stamp: Rect,
  options?: { multiplier?: number; quality?: number },
) {
  const { left, top, width, height } = getStampBoundsOnCanvas(canvas, stamp)
  canvas.discardActiveObject()
  canvas.requestRenderAll()
  return canvas.toDataURL({
    format: 'jpeg',
    quality: options?.quality ?? 0.92,
    multiplier: options?.multiplier ?? 2,
    left,
    top,
    width,
    height,
  })
}

export function exportStampSvg(canvas: Canvas, stamp: Rect) {
  const { left, top, width, height } = getStampBoundsOnCanvas(canvas, stamp)
  canvas.discardActiveObject()
  canvas.requestRenderAll()
  return canvas.toSVG({
    viewBox: {
      x: left,
      y: top,
      width,
      height,
    },
    width: `${width}`,
    height: `${height}`,
  })
}
