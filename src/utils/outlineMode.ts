import { Rect, type FabricObject, type Group } from 'fabric'

import { STAMP_BG_NAME } from './fabricHelpers'
import { FRAME_OBJECT_TAG } from './stampImageHelpers'
import { isTextObject } from './textHelpers'

const OUTLINE_STROKE = 'rgba(255, 255, 255, 0.72)'
const OUTLINE_STROKE_WIDTH = 1
export const OUTLINE_OVERLAY_TAG = 'stampstudio-outline-overlay'

type CachedProps = {
  fill?: string | object | null
  stroke?: string | null
  strokeWidth?: number
  opacity?: number
  shadow?: object | null
  backgroundColor?: string
  textBackgroundColor?: string
  visible?: boolean
}

const cache = new WeakMap<FabricObject, CachedProps>()

function isOutlineOverlay(
  obj: FabricObject,
): obj is FabricObject & { stampstudioOutlineOverlay?: boolean } {
  return (
    (obj as FabricObject & { stampstudioOutlineOverlay?: boolean })
      .stampstudioOutlineOverlay === true
  )
}

function isFrameObject(obj: FabricObject): boolean {
  return (
    (obj as FabricObject & { stampstudioTag?: string }).stampstudioTag ===
    FRAME_OBJECT_TAG
  )
}

function cacheObject(obj: FabricObject) {
  if (cache.has(obj)) return
  const cached: CachedProps = {
    fill: obj.fill as string | object | null,
    stroke: obj.stroke as string | null,
    strokeWidth: obj.strokeWidth,
    opacity: obj.opacity,
    shadow: obj.shadow ?? null,
    visible: obj.visible,
  }
  if (isTextObject(obj)) {
    cached.backgroundColor = obj.backgroundColor ?? ''
    cached.textBackgroundColor = obj.textBackgroundColor ?? ''
  }
  cache.set(obj, cached)
}

function createOutlineOverlay(source: FabricObject): Rect {
  const outline = new Rect({
    left: source.left,
    top: source.top,
    width: source.width,
    height: source.height,
    scaleX: source.scaleX,
    scaleY: source.scaleY,
    angle: source.angle,
    skewX: source.skewX,
    skewY: source.skewY,
    originX: source.originX,
    originY: source.originY,
    fill: 'transparent',
    stroke: OUTLINE_STROKE,
    strokeWidth: OUTLINE_STROKE_WIDTH,
    selectable: false,
    evented: false,
    objectCaching: false,
  })
  ;(
    outline as Rect & {
      stampstudioOutlineOverlay?: boolean
      stampstudioOutlineSource?: FabricObject
    }
  ).stampstudioOutlineOverlay = true
  ;(
    outline as Rect & { stampstudioOutlineSource?: FabricObject }
  ).stampstudioOutlineSource = source
  return outline
}

function applyOutlineToObject(stamp: Group, obj: FabricObject) {
  if (isOutlineOverlay(obj)) return

  cacheObject(obj)
  const isBg =
    (obj as FabricObject & { name?: string }).name === STAMP_BG_NAME

  if (isBg || isTextObject(obj)) {
    obj.set({
      fill: 'transparent',
      stroke: OUTLINE_STROKE,
      strokeWidth: OUTLINE_STROKE_WIDTH,
      shadow: null,
      ...(isTextObject(obj)
        ? { backgroundColor: '', textBackgroundColor: '' }
        : {}),
    })
    return
  }

  if (isFrameObject(obj)) {
    obj.set({
      opacity: 0,
      selectable: false,
      evented: false,
    })
    const overlay = createOutlineOverlay(obj)
    stamp.add(overlay)
  }
}

function removeOutlineOverlays(stamp: Group) {
  const overlays = stamp
    .getObjects()
    .filter((obj) => isOutlineOverlay(obj))
  for (const overlay of overlays) {
    stamp.remove(overlay)
  }
}

/** Apply wireframe outline treatment to all stamp children. */
export function applyOutlineMode(stamp: Group) {
  removeOutlineOverlays(stamp)
  for (const obj of stamp.getObjects()) {
    applyOutlineToObject(stamp, obj)
  }
  stamp.setCoords()
}

/** Restore stamp children to their pre-outline appearance. */
export function restoreOutlineMode(stamp: Group) {
  removeOutlineOverlays(stamp)

  for (const obj of stamp.getObjects()) {
    if (isOutlineOverlay(obj)) continue
    const cached = cache.get(obj)
    if (!cached) continue

    obj.set({
      fill: cached.fill,
      stroke: cached.stroke,
      strokeWidth: cached.strokeWidth,
      opacity: cached.opacity,
      shadow: cached.shadow,
      visible: cached.visible,
      selectable: true,
      evented: true,
      ...(isTextObject(obj)
        ? {
            backgroundColor: cached.backgroundColor,
            textBackgroundColor: cached.textBackgroundColor,
          }
        : {}),
    })
    cache.delete(obj)
  }
  stamp.setCoords()
}
