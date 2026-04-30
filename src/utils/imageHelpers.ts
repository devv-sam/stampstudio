/**
 * Browser-image utilities for the upload + crop pipeline.
 *
 * All assets in the editor are stored as data URLs (no remote fetches), so
 * these helpers stay deliberately small — load an image, read a File as a
 * data URL, and run the cropper output through a canvas to produce a
 * standalone PNG of the cropped region.
 */

export type CropPixelArea = {
  x: number
  y: number
  width: number
  height: number
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () =>
      reject(new Error('Failed to load image (invalid or unreadable source)'))
    img.src = src
  })
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('FileReader did not return a string'))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

/**
 * Render the cropper's pixel-area selection of `src` to a fresh PNG data URL.
 *
 * `pixelArea` is in source-image coordinates (what react-easy-crop returns
 * via onCropComplete). The output is exactly that region, 1:1 — no resampling
 * unless the caller wants to scale post-hoc.
 */
export async function cropImageToDataUrl(
  src: string,
  pixelArea: CropPixelArea,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadHtmlImage(src)
  const width = Math.max(1, Math.round(pixelArea.width))
  const height = Math.max(1, Math.round(pixelArea.height))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  ctx.drawImage(
    img,
    pixelArea.x,
    pixelArea.y,
    pixelArea.width,
    pixelArea.height,
    0,
    0,
    width,
    height,
  )

  return { dataUrl: canvas.toDataURL('image/png'), width, height }
}

/** Generate a short, collision-resistant id (no nanoid dependency needed). */
export function shortId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().split('-')[0]
  }
  return Math.random().toString(36).slice(2, 10)
}
