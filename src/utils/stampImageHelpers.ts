import {
  type Canvas,
  FabricImage,
  Group,
  Pattern,
  Point,
  type FabricObject,
} from 'fabric'

import { loadHtmlImage } from './imageHelpers'
import { coverPatternTransform, getStampBgRect } from './fabricHelpers'

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
export async function buildBackgroundPattern(
  src: string,
  width: number,
  height: number,
): Promise<Pattern> {
  const img = await loadHtmlImage(src)
  return new Pattern({
    source: img,
    repeat: 'no-repeat',
    patternTransform: coverPatternTransform(img, width, height),
  })
}

/** Apply (or clear) the stamp Rect's image-pattern fill. */
export async function applyStampBackground(
  canvas: Canvas,
  stamp: Group,
  src: string | null,
  fallbackColor: string,
) {
  const bgRect = getStampBgRect(stamp)
  if (!bgRect) return

  if (!src) {
    bgRect.set({ fill: fallbackColor })
    canvas.requestRenderAll()
    return
  }
  const pattern = await buildBackgroundPattern(src, stamp.width, stamp.height)
  bgRect.set({ fill: pattern })
  canvas.requestRenderAll()
}

/**
 * Add a frame image as a Fabric object that lives inside the stamp.
 *
 * The frame is sized to ~50% of the base stamp dimensions (whichever dimension
 * fits) and centered in stamp-local coordinates. The parent stamp Group clips
 * all children automatically, so no per-frame clipPath is needed.
 */
export async function addFrameImage(
  canvas: Canvas,
  stamp: Group,
  src: string,
  assetId: string,
): Promise<FabricImage> {
  const fabricImg = await FabricImage.fromURL(src)
  stamp.setCoords()
  const stampCenter = stamp.getCenterPoint()
  const targetMax = Math.min(stamp.width, stamp.height) * 0.5

  const imgW = fabricImg.width || 1
  const imgH = fabricImg.height || 1
  const fit = Math.min(targetMax / imgW, targetMax / imgH)

  fabricImg.set({
    originX: 'center',
    originY: 'center',
    // IMPORTANT: Group#add() interprets incoming object coordinates in canvas
    // space and converts them to group-local coordinates. Seed at stamp center
    // so the converted local coords land at (0,0), not far off-stamp.
    left: stampCenter.x,
    top: stampCenter.y,
    scaleX: fit,
    scaleY: fit,
    lockRotation: false,
  })
  fabricImg.setCoords()

  // Tagged so the provider can find / remove later without holding refs.
  ;(fabricImg as FabricObject & { stampstudioTag?: string }).stampstudioTag =
    FRAME_OBJECT_TAG
  ;(fabricImg as FabricObject & { stampstudioAssetId?: string }).stampstudioAssetId =
    assetId

  fabricImg.on('moving', () => {
    constrainFrameInGroup(fabricImg)
  })

  stamp.add(fabricImg)
  // Ensure local center after insertion regardless of conversion edge-cases.
  fabricImg.setRelativeXY(new Point(0, 0), 'center', 'center')
  constrainFrameInGroup(fabricImg)
  stamp.setCoords()
  canvas.setActiveObject(fabricImg)
  canvas.requestRenderAll()
  return fabricImg
}

/**
 * Clamp a frame so its rendered bounding box stays inside group-local bounds.
 * If the frame is larger than the stamp on any axis we pin that axis to zero.
 */
function constrainFrameInGroup(frame: FabricImage) {
  frame.setCoords()
  // Use group-local dimensions here (object width * object scale), not
  // getScaledWidth()/getScaledHeight(), because those include parent group
  // transforms and can over-constrain movement while dragging.
  const frameW = (frame.width || 0) * Math.abs(frame.scaleX || 1)
  const frameH = (frame.height || 0) * Math.abs(frame.scaleY || 1)
  const stamp = frame.parent
  if (!stamp) return
  const halfStampW = stamp.width / 2
  const halfStampH = stamp.height / 2
  const halfFrameW = frameW / 2
  const halfFrameH = frameH / 2

  const minX = -halfStampW + halfFrameW
  const maxX = halfStampW - halfFrameW
  const minY = -halfStampH + halfFrameH
  const maxY = halfStampH - halfFrameH

  const nextLeft =
    minX > maxX ? 0 : Math.max(minX, Math.min(maxX, frame.left ?? 0))
  const nextTop =
    minY > maxY ? 0 : Math.max(minY, Math.min(maxY, frame.top ?? 0))

  if (nextLeft !== frame.left || nextTop !== frame.top) {
    frame.set({ left: nextLeft, top: nextTop })
    frame.setCoords()
  }
}

export function getAllFrameObjects(stamp: Group): FabricImage[] {
  return stamp.getObjects().filter((obj) => {
    const tagged = obj as FabricObject & { stampstudioTag?: string }
    return tagged.stampstudioTag === FRAME_OBJECT_TAG
  }) as FabricImage[]
}

export function findFrameByAssetId(
  stamp: Group,
  assetId: string,
): FabricImage | null {
  for (const obj of getAllFrameObjects(stamp)) {
    const tagged = obj as FabricObject & { stampstudioAssetId?: string }
    if (tagged.stampstudioAssetId === assetId) return obj
  }
  return null
}

export function removeFrameByAssetId(
  canvas: Canvas,
  stamp: Group,
  assetId: string,
) {
  const frame = findFrameByAssetId(stamp, assetId)
  if (!frame) return
  stamp.remove(frame)
  stamp.setCoords()
  canvas.requestRenderAll()
}

export function removeAllFrames(canvas: Canvas, stamp: Group) {
  for (const frame of getAllFrameObjects(stamp)) {
    stamp.remove(frame)
  }
  stamp.setCoords()
  canvas.requestRenderAll()
}

/**
 * Swap an existing frame's source image (e.g. after a recrop) while
 * preserving its current position, rotation, and scale. If no frame is
 * mounted for `assetId` the call resolves to `false` so the caller can
 * fall back to a fresh add.
 */
export async function updateFrameSrc(
  canvas: Canvas,
  stamp: Group,
  assetId: string,
  src: string,
): Promise<boolean> {
  const frame = findFrameByAssetId(stamp, assetId)
  if (!frame) return false
  await frame.setSrc(src)
  // Re-clamp in case the new image's intrinsic dimensions changed and
  // pushed the frame out of the stamp's local bounds.
  frame.setCoords()
  stamp.setCoords()
  canvas.requestRenderAll()
  return true
}
