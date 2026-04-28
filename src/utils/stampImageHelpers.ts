import {
  type Canvas,
  FabricImage,
  Pattern,
  Rect,
  type FabricObject,
} from 'fabric'

import { loadHtmlImage } from './imageHelpers'
import { STAMP_BASE_HEIGHT, STAMP_BASE_WIDTH } from './fabricHelpers'

/** Marker put on every Fabric frame element so we can find/remove them. */
export const FRAME_OBJECT_TAG = 'stampstudio-frame'

/**
 * Build a Pattern that fills the stamp Rect with the given image using
 * a "cover" fit (image fills the entire rect, cropping overflow).
 *
 * The pattern operates in the rect's *local* coordinate space (pre-scale),
 * so the image always covers the full unscaled stamp body — Fabric's own
 * scaling then sizes everything together.
 */
export async function buildBackgroundPattern(src: string): Promise<Pattern> {
  const img = await loadHtmlImage(src)
  const targetW = STAMP_BASE_WIDTH
  const targetH = STAMP_BASE_HEIGHT
  const scale = Math.max(targetW / img.width, targetH / img.height)
  const scaledW = img.width * scale
  const scaledH = img.height * scale
  const offsetX = (targetW - scaledW) / 2
  const offsetY = (targetH - scaledH) / 2

  return new Pattern({
    source: img,
    repeat: 'no-repeat',
    patternTransform: [scale, 0, 0, scale, offsetX, offsetY],
  })
}

/** Apply (or clear) the stamp Rect's image-pattern fill. */
export async function applyStampBackground(
  canvas: Canvas,
  stamp: Rect,
  src: string | null,
  fallbackColor: string,
) {
  if (!src) {
    stamp.set({ fill: fallbackColor })
    canvas.requestRenderAll()
    return
  }
  const pattern = await buildBackgroundPattern(src)
  stamp.set({ fill: pattern })
  canvas.requestRenderAll()
}

/**
 * Add a frame image as a Fabric object that lives inside the stamp.
 *
 * The frame is sized to ~50% of the stamp's current scaled bounds (whichever
 * dimension fits) and centred on the stamp. A clipPath rect — bound to the
 * stamp's live position — keeps the frame visually clipped to the stamp's
 * edges, so dragging the frame partially off-stamp simply hides the overflow
 * instead of letting it overhang.
 */
export async function addFrameImage(
  canvas: Canvas,
  stamp: Rect,
  src: string,
  assetId: string,
): Promise<FabricImage> {
  const fabricImg = await FabricImage.fromURL(src)
  const stampBounds = stamp.getBoundingRect()
  const targetMax = Math.min(stampBounds.width, stampBounds.height) * 0.5

  const imgW = fabricImg.width || 1
  const imgH = fabricImg.height || 1
  const fit = Math.min(targetMax / imgW, targetMax / imgH)

  fabricImg.set({
    left: stampBounds.left + stampBounds.width / 2,
    top: stampBounds.top + stampBounds.height / 2,
    originX: 'center',
    originY: 'center',
    scaleX: fit,
    scaleY: fit,
    cornerStyle: 'circle',
    cornerColor: 'rgba(255, 255, 255, 0.95)',
    cornerStrokeColor: 'rgba(0, 0, 0, 0.4)',
    transparentCorners: false,
    cornerSize: 10,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderScaleFactor: 1,
    lockRotation: false,
  })
  // Tagged so the provider can find / remove later without holding refs.
  ;(fabricImg as FabricObject & { stampstudioTag?: string }).stampstudioTag =
    FRAME_OBJECT_TAG
  ;(fabricImg as FabricObject & { stampstudioAssetId?: string }).stampstudioAssetId =
    assetId

  fabricImg.clipPath = makeStampClipPath(stamp)

  canvas.add(fabricImg)
  canvas.setActiveObject(fabricImg)
  canvas.requestRenderAll()
  return fabricImg
}

/**
 * A clipPath rect that mirrors the stamp's current position and size.
 *
 * `absolutePositioned: true` makes the clipPath operate in canvas coords,
 * not relative to the clipped object's own transform — exactly what we want
 * for a stamp-scoped viewport.
 */
function makeStampClipPath(stamp: Rect): Rect {
  const bounds = stamp.getBoundingRect()
  return new Rect({
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
    rx: (stamp.rx || 0) * (stamp.scaleX || 1),
    ry: (stamp.ry || 0) * (stamp.scaleY || 1),
    absolutePositioned: true,
  })
}

/** Re-sync every frame's clipPath to the stamp's current bounds. */
export function refreshFrameClipPaths(canvas: Canvas, stamp: Rect) {
  const frames = getAllFrameObjects(canvas)
  if (!frames.length) return
  for (const frame of frames) {
    frame.clipPath = makeStampClipPath(stamp)
  }
  canvas.requestRenderAll()
}

export function getAllFrameObjects(canvas: Canvas): FabricImage[] {
  return canvas.getObjects().filter((obj) => {
    const tagged = obj as FabricObject & { stampstudioTag?: string }
    return tagged.stampstudioTag === FRAME_OBJECT_TAG
  }) as FabricImage[]
}

export function findFrameByAssetId(
  canvas: Canvas,
  assetId: string,
): FabricImage | null {
  for (const obj of getAllFrameObjects(canvas)) {
    const tagged = obj as FabricObject & { stampstudioAssetId?: string }
    if (tagged.stampstudioAssetId === assetId) return obj
  }
  return null
}

export function removeFrameByAssetId(canvas: Canvas, assetId: string) {
  const frame = findFrameByAssetId(canvas, assetId)
  if (!frame) return
  canvas.remove(frame)
  canvas.requestRenderAll()
}

export function removeAllFrames(canvas: Canvas) {
  for (const frame of getAllFrameObjects(canvas)) {
    canvas.remove(frame)
  }
  canvas.requestRenderAll()
}
