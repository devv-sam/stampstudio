import {
  type Canvas,
  IText,
  Point,
  type FabricObject,
  type Group,
} from 'fabric'

import { STAMP_BASE_HEIGHT, STAMP_BASE_WIDTH } from './fabricHelpers'
import type { TextLayer } from '../types/text'

export const TEXT_OBJECT_TAG = 'stampstudio-text'

function configureTextObject(text: IText) {
  text.set({
    originX: 'center',
    originY: 'center',
    cornerStyle: 'circle',
    cornerColor: 'rgba(255, 255, 255, 0.95)',
    cornerStrokeColor: 'rgba(0, 0, 0, 0.4)',
    transparentCorners: false,
    cornerSize: 10,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderScaleFactor: 1,
    padding: 2,
  })
}

export function isTextObject(
  obj: FabricObject | undefined | null,
): obj is IText & { stampstudioTag: typeof TEXT_OBJECT_TAG } {
  return (
    !!obj &&
    (obj as FabricObject & { stampstudioTag?: string }).stampstudioTag ===
      TEXT_OBJECT_TAG
  )
}

export function readTextLayerId(
  obj: FabricObject | undefined | null,
): string | null {
  if (!isTextObject(obj)) return null
  const id = (obj as IText & { stampstudioTextId?: string }).stampstudioTextId
  return id ?? null
}

export type TextScenePlacement = { x: number; y: number }

/**
 * Create Fabric IText inside the stamp. With `scenePoint`, positions the object's
 * center at that Fabric scene coordinate (after `stamp.add`, via `setXY`);
 * otherwise centers on the stamp.
 */
export function addTextObject(
  canvas: Canvas,
  stamp: Group,
  layer: TextLayer,
  scenePoint?: TextScenePlacement,
): IText {
  stamp.setCoords()

  const text = new IText(layer.content, {
    fontFamily: layer.fontFamily,
    fontWeight: String(layer.fontWeight),
    fontSize: layer.fontSize,
    fill: layer.color,
    selectable: true,
    evented: true,
  })
  configureTextObject(text)
  ;(text as FabricObject & { stampstudioTag?: string }).stampstudioTag =
    TEXT_OBJECT_TAG
  ;(text as FabricObject & { stampstudioTextId?: string }).stampstudioTextId =
    layer.id
  text.on('moving', () => constrainTextInGroup(text))
  text.on('scaling', () => constrainTextInGroup(text))

  stamp.add(text)

  /** Scene XY must run after child is grouped — setXY relies on invertTransform(group). */
  if (scenePoint) {
    text.setXY(new Point(scenePoint.x, scenePoint.y), 'center', 'center')
  } else {
    text.setXY(stamp.getCenterPoint(), 'center', 'center')
  }

  constrainTextInGroup(text)
  stamp.setCoords()
  canvas.setActiveObject(text)
  canvas.requestRenderAll()
  return text
}

export function constrainTextInGroup(text: IText) {
  text.setCoords()
  const textW = (text.width || 0) * Math.abs(text.scaleX || 1)
  const textH = (text.height || 0) * Math.abs(text.scaleY || 1)
  const halfStampW = STAMP_BASE_WIDTH / 2
  const halfStampH = STAMP_BASE_HEIGHT / 2
  const halfTextW = textW / 2
  const halfTextH = textH / 2

  const minX = -halfStampW + halfTextW
  const maxX = halfStampW - halfTextW
  const minY = -halfStampH + halfTextH
  const maxY = halfStampH - halfTextH

  const nextLeft =
    minX > maxX ? 0 : Math.max(minX, Math.min(maxX, text.left ?? 0))
  const nextTop = minY > maxY ? 0 : Math.max(minY, Math.min(maxY, text.top ?? 0))

  if (nextLeft !== text.left || nextTop !== text.top) {
    text.set({ left: nextLeft, top: nextTop })
    text.setCoords()
  }
}

export function getAllTextObjects(stamp: Group): IText[] {
  return stamp.getObjects().filter(isTextObject) as IText[]
}

export function findTextByLayerId(stamp: Group, layerId: string): IText | null {
  for (const text of getAllTextObjects(stamp)) {
    const tagged = text as IText & { stampstudioTextId?: string }
    if (tagged.stampstudioTextId === layerId) return text
  }
  return null
}

export function removeTextByLayerId(canvas: Canvas, stamp: Group, layerId: string) {
  const text = findTextByLayerId(stamp, layerId)
  if (!text) return
  stamp.remove(text)
  stamp.setCoords()
  canvas.requestRenderAll()
}

export function removeAllTextObjects(canvas: Canvas, stamp: Group) {
  for (const t of getAllTextObjects(stamp)) {
    stamp.remove(t)
  }
  stamp.setCoords()
  canvas.requestRenderAll()
}

export function updateTextObject(
  canvas: Canvas,
  stamp: Group,
  layer: TextLayer,
): IText | null {
  const text = findTextByLayerId(stamp, layer.id)
  if (!text) return null
  text.set({
    text: layer.content,
    fontFamily: layer.fontFamily,
    fontWeight: String(layer.fontWeight),
    fontSize: layer.fontSize,
    fill: layer.color,
  })
  constrainTextInGroup(text)
  stamp.setCoords()
  canvas.requestRenderAll()
  return text
}
