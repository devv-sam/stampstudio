import {
  type Canvas,
  FabricImage,
  Group,
  Pattern,
  Point,
  type FabricObject,
} from 'fabric'

import { loadHtmlImage } from './imageHelpers'
import {
  getStampBgRect,
  STAMP_BASE_HEIGHT,
  STAMP_BASE_WIDTH,
} from './fabricHelpers'

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
  const pattern = await buildBackgroundPattern(src)
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
  const targetMax = Math.min(STAMP_BASE_WIDTH, STAMP_BASE_HEIGHT) * 0.5

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
    cornerStyle: 'circle',
    cornerColor: 'rgba(255, 255, 255, 0.95)',
    cornerStrokeColor: 'rgba(0, 0, 0, 0.4)',
    transparentCorners: false,
    cornerSize: 10,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderScaleFactor: 1,
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
  fabricImg.on('scaling', () => {
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
  const halfStampW = STAMP_BASE_WIDTH / 2
  const halfStampH = STAMP_BASE_HEIGHT / 2
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
