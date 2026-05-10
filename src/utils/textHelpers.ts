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

export type AddTextOptions = {
  scenePoint?: TextScenePlacement
  /** Called whenever the user edits the IText in-place so React state can mirror it. */
  onContentChange?: (next: string) => void
}

/**
 * Create Fabric IText inside the stamp. With `scenePoint`, positions the object's
 * center at that Fabric scene coordinate (after `stamp.add`, via `setXY`);
 * otherwise centers on the stamp.
 */
export function addTextObject(
  canvas: Canvas,
  stamp: Group,
  layer: TextLayer,
  options: AddTextOptions = {},
): IText {
  stamp.setCoords()

  const text = new IText(layer.content, {
    fontFamily: layer.fontFamily,
    fontWeight: String(layer.fontWeight),
    fontSize: layer.fontSize,
    fill: layer.color,
    selectable: true,
    evented: true,
    /** IText caches a rendered bitmap; while typing/font-swapping we need fresh paints. */
    objectCaching: false,
  })
  configureTextObject(text)
  ;(text as FabricObject & { stampstudioTag?: string }).stampstudioTag =
    TEXT_OBJECT_TAG
  ;(text as FabricObject & { stampstudioTextId?: string }).stampstudioTextId =
    layer.id
  text.on('moving', () => constrainTextInGroup(text))
  text.on('scaling', () => constrainTextInGroup(text))
  if (options.onContentChange) {
    const cb = options.onContentChange
    /** Fires on every keystroke during in-place editing. */
    text.on('changed', () => cb(text.text ?? ''))
  }

  stamp.add(text)

  /** Scene XY must run after child is grouped — setXY relies on invertTransform(group). */
  if (options.scenePoint) {
    text.setXY(
      new Point(options.scenePoint.x, options.scenePoint.y),
      'center',
      'center',
    )
  } else {
    text.setXY(stamp.getCenterPoint(), 'center', 'center')
  }

  constrainTextInGroup(text)
  stamp.setCoords()
  canvas.setActiveObject(text)
  canvas.requestRenderAll()
  reRenderAfterFontLoad(
    canvas,
    text,
    layer.fontFamily,
    layer.fontWeight,
    layer.fontSize,
  )
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

/**
 * Ask the browser to load a font into its FontFaceSet, then re-measure and
 * re-render the IText so the newly-selected typeface actually appears.
 * Canvas2D only picks up a font once it is in document.fonts, AND Fabric's
 * IText caches glyph metrics from the first paint — without `initDimensions`
 * + `dirty` the text keeps the fallback font's width/height and renders
 * incorrectly even after the real font loads.
 */
function reRenderAfterFontLoad(
  canvas: Canvas,
  text: IText,
  fontFamily: string,
  fontWeight: number,
  fontSize: number,
): void {
  if (typeof document === 'undefined' || !document.fonts) return
  const spec = `${fontWeight} ${fontSize}px "${fontFamily}"`
  document.fonts
    .load(spec)
    .then(() => {
      // Family may have changed again before the promise resolved (rapid clicks);
      // re-check current state instead of trusting captured args.
      if (text.fontFamily !== fontFamily) return
      text.initDimensions()
      text.set('dirty', true)
      canvas.requestRenderAll()
    })
    .catch(() => {
      /* font unavailable — initial render already shows fallback */
    })
}

export function updateTextObject(
  canvas: Canvas,
  stamp: Group,
  layer: TextLayer,
): IText | null {
  const text = findTextByLayerId(stamp, layer.id)
  if (!text) return null
  /**
   * Only overwrite `text` when the React-side `content` actually changed —
   * otherwise a typography update (font/size/weight/color) would clobber
   * an in-progress in-place edit on the canvas with stale state.
   */
  const next: Partial<IText> = {
    fontFamily: layer.fontFamily,
    fontWeight: String(layer.fontWeight),
    fontSize: layer.fontSize,
    fill: layer.color,
  }
  if (text.text !== layer.content) next.text = layer.content
  text.set(next)
  /** Force re-measurement so stale glyph metrics from the previous font don't stick. */
  text.initDimensions()
  text.set('dirty', true)
  constrainTextInGroup(text)
  stamp.setCoords()
  canvas.requestRenderAll()
  reRenderAfterFontLoad(
    canvas,
    text,
    layer.fontFamily,
    layer.fontWeight,
    layer.fontSize,
  )
  return text
}
