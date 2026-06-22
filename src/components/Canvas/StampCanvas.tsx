import {
  Canvas,
  Point,
  type FabricObject,
  type TPointerEventInfo,
} from 'fabric'
import type { Group } from 'fabric'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { useCanvasSize } from '../../hooks/useCanvas'
import { useStampEditor } from '../../hooks/useStampEditor'
import type { TextLayer } from '../../types/text'
import type { StampCanvasApi } from '../../types/canvas'
import {
  applyStampResizeHandles,
  clampStampBoundsAndCenter,
  createStampGroup,
  STAMP_BASE_HEIGHT,
  STAMP_BASE_WIDTH,
} from '../../utils/fabricHelpers'
import {
  STAMP_SNAP_COMMIT_THRESHOLD_PX,
  STAMP_SNAP_GUIDE_OUTSET_PX,
  STAMP_SNAP_PRESETS,
  STAMP_SNAP_PREVIEW_THRESHOLD_PX,
} from '../../utils/stampSnapSizes'
import { FRAME_OBJECT_TAG } from '../../utils/stampImageHelpers'
import {
  findTextByLayerId,
  getAllTextObjects,
  isTextObject,
  readTextLayerId,
} from '../../utils/textHelpers'
import { punchPerforationHoles } from '../../utils/exportHelpers'
import { applyOutlineMode, restoreOutlineMode } from '../../utils/outlineMode'
import { StampPerforations } from './StampPerforations'
import { ShaderLayer } from './ShaderLayer'
import {
  StampResizeChromeOverlay,
  type ChromeRect,
} from './StampResizeChromeOverlay'

function readChromeFromStamp(stamp: Group): ChromeRect {
  const box = stamp.getBoundingRect()
  const sx = stamp.scaleX || 1
  const clip = stamp.clipPath as { rx?: number } | undefined
  const baseRx = (clip?.rx || 0) * sx
  const rx = Math.min(
    Math.max(0, baseRx),
    box.width / 2 - 0.5,
    box.height / 2 - 0.5,
  )
  return {
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
    rx,
  }
}

function chromeEqual(a: ChromeRect | null, b: ChromeRect | null) {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height &&
    a.rx === b.rx
  )
}

/** Stamp canvas matches the stamp; allow a tiny epsilon at edges for float/retina. */
function pointerOnStampCanvas(
  canvas: Canvas,
  opt: { scenePoint: { x: number; y: number } },
) {
  const w = canvas.getWidth()
  const h = canvas.getHeight()
  const { x, y } = opt.scenePoint
  const e = 0.5
  return x >= -e && y >= -e && x <= w + e && y <= h + e
}

/** Hover resize UX: only auto-select stamp (show L-brackets + Fabric corners) near corners — not the whole interior. */
function isNearStampResizeCorner(
  stamp: Group,
  scenePoint: { x: number; y: number },
  marginPx: number,
) {
  stamp.setCoords()
  const box = stamp.getBoundingRect()
  const corners = [
    { x: box.left, y: box.top },
    { x: box.left + box.width, y: box.top },
    { x: box.left, y: box.top + box.height },
    { x: box.left + box.width, y: box.top + box.height },
  ]
  return corners.some(
    (c) =>
      Math.abs(scenePoint.x - c.x) <= marginPx &&
      Math.abs(scenePoint.y - c.y) <= marginPx,
  )
}

function pointerButtonsDown(e: unknown): boolean {
  if (
    e &&
    typeof e === 'object' &&
    'buttons' in e &&
    typeof (e as PointerEvent).buttons === 'number'
  ) {
    return (e as PointerEvent).buttons !== 0
  }
  return false
}

function centeredStampScreenRect(
  stageW: number,
  stageH: number,
  stampW: number,
  stampH: number,
) {
  return {
    left: (stageW - stampW) / 2,
    top: (stageH - stampH) / 2,
    width: stampW,
    height: stampH,
  }
}

type RectBounds = { left: number; top: number; width: number; height: number }

function isFrameObject(
  obj: FabricObject | undefined | null,
): obj is FabricObject & { stampstudioTag: typeof FRAME_OBJECT_TAG } {
  return (
    !!obj &&
    (obj as FabricObject & { stampstudioTag?: string }).stampstudioTag ===
      FRAME_OBJECT_TAG
  )
}

/**
 * Travel boundary in fabric canvas coordinates (same as wrapper; stamp fills the canvas).
 */
function readFrameTravelRectFabric(_stamp: Group, frame: FabricObject): RectBounds {
  void frame
  return {
    left: 0,
    top: 0,
    width: _stamp.getScaledWidth(),
    height: _stamp.getScaledHeight(),
  }
}

export function StampCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const stampRef = useRef<ReturnType<typeof createStampGroup> | null>(
    null,
  )
  /** The stamp size the user last explicitly set — preserved across stage resizes. */
  const userDesiredStampSizeRef = useRef({ w: STAMP_BASE_WIDTH, h: STAMP_BASE_HEIGHT })

  const { width: stageW, height: stageH } = useCanvasSize(wrapRef)
  /** Fresh stage size for Fabric handlers (init effect closure is otherwise stale). */
  const stageSizeRef = useRef({ w: stageW, h: stageH })

  const [chromeRect, setChromeRect] = useState<ChromeRect | null>(null)
  const [stampRect, setStampRect] = useState<RectBounds | null>(() =>
    centeredStampScreenRect(800, 600, 420, 300),
  )
  const [frameTravelRect, setFrameTravelRect] = useState<RectBounds | null>(
    null,
  )
  const [snapGuide, setSnapGuide] = useState<{
    w: number
    h: number
    /** Larger dashed frame + early preview — only when resizing larger than gesture start. */
    expanded: boolean
  } | null>(null)
  const stampRectRef = useRef<RectBounds | null>(stampRect)
  /** Stamp area (w×h) at pointer-down on a resize handle — grow vs shrink for snap UI. */
  const resizeGestureStartAreaRef = useRef(0)
  /** True while dragging a stamp corner — must not discard selection on pointerleave (shell re-centers during resize). */
  const isStampResizingRef = useRef(false)

  const {
    register,
    unregister,
    perforationCount,
    activeShader,
    shaderParams,
    backgroundAsset,
    frameAssets,
    stampColor,
    snapToPresetsEnabledRef,
    setSelectedTextId,
    updateTextLayer,
    selectedTextId,
    textLayers,
    textPlacementActive,
    addTextLayerAtScene,
    canvasZoom,
    setCanvasZoom,
    outlineMode,
  } = useStampEditor()

  const canvasZoomRef = useRef(canvasZoom)
  const textOverlayRef = useRef<HTMLCanvasElement>(null)
  const activeShaderRef = useRef(activeShader)

  const updateTextLayerRef = useRef<
    (
      id: string,
      patch: Partial<TextLayer>,
      opts?: { syncToFabric?: boolean },
    ) => void
  >(() => {})
  const setSelectedTextIdRef = useRef<(id: string | null) => void>(() => {})
  const textPlacementActiveRef = useRef(false)
  const addTextLayerAtSceneRef = useRef<(x: number, y: number) => void>(
    () => {},
  )

  useLayoutEffect(() => {
    stageSizeRef.current.w = stageW
    stageSizeRef.current.h = stageH
  }, [stageW, stageH])

  useLayoutEffect(() => {
    updateTextLayerRef.current = updateTextLayer
    setSelectedTextIdRef.current = setSelectedTextId
  }, [updateTextLayer, setSelectedTextId])

  useLayoutEffect(() => {
    textPlacementActiveRef.current = textPlacementActive
  }, [textPlacementActive])

  useLayoutEffect(() => {
    addTextLayerAtSceneRef.current = addTextLayerAtScene
  }, [addTextLayerAtScene])

  useLayoutEffect(() => {
    canvasZoomRef.current = canvasZoom
  }, [canvasZoom])

  useLayoutEffect(() => {
    activeShaderRef.current = activeShader
    if (!activeShader) {
      const overlay = textOverlayRef.current
      if (overlay) {
        const ctx = overlay.getContext('2d')
        ctx?.clearRect(0, 0, overlay.width, overlay.height)
      }
    }
  }, [activeShader])

  useEffect(() => {
    const c = fabricRef.current
    const s = stampRef.current
    if (!c || !s) return
    if (outlineMode) {
      applyOutlineMode(s)
    } else {
      restoreOutlineMode(s)
    }
    c.requestRenderAll()
  }, [outlineMode, textLayers, backgroundAsset, frameAssets, activeShader])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const factor = 1 - e.deltaY * 0.003
      const next = Math.max(0.25, Math.min(4, canvasZoomRef.current * factor))
      setCanvasZoom(next)
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [setCanvasZoom])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    let lastDist = 0
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastDist = Math.hypot(
          e.touches[1]!.clientX - e.touches[0]!.clientX,
          e.touches[1]!.clientY - e.touches[0]!.clientY,
        )
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      e.preventDefault()
      const dist = Math.hypot(
        e.touches[1]!.clientX - e.touches[0]!.clientX,
        e.touches[1]!.clientY - e.touches[0]!.clientY,
      )
      if (lastDist > 0) {
        const scale = dist / lastDist
        const next = Math.max(0.25, Math.min(4, canvasZoomRef.current * scale))
        setCanvasZoom(next)
      }
      lastDist = dist
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [setCanvasZoom])

  /** Fabric sets upper-canvas cursor on every move — override after toggle so I-beam shows without waiting for mousemove. */
  useLayoutEffect(() => {
    const c = fabricRef.current
    if (!c) return
    if (textPlacementActive) {
      c.setCursor('text')
    } else {
      c.setCursor('default')
    }
  }, [textPlacementActive])

  useLayoutEffect(() => {
    const c = fabricRef.current
    if (!c) return
    c.selection = !textPlacementActive
  }, [textPlacementActive])

  useEffect(() => {
    stampRectRef.current = stampRect
  }, [stampRect])

  /** When the panel picks a text layer, mirror selection on Fabric once the object exists. */
  useEffect(() => {
    const c = fabricRef.current
    const s = stampRef.current
    if (!c || !s || !selectedTextId) return
    const t = findTextByLayerId(s, selectedTextId)
    if (t && c.getActiveObject() !== t) {
      c.setActiveObject(t)
      c.requestRenderAll()
    }
  }, [selectedTextId, textLayers])

  useEffect(() => {
    const el = canvasElRef.current
    if (!el) return

    const fabricCanvas = new Canvas(el, {
      width: 420,
      height: 300,
      backgroundColor: undefined,
      preserveObjectStacking: true,
      centeredScaling: true,
      uniformScaling: false,
    })

    const stamp = createStampGroup()
    applyStampResizeHandles(stamp)
    fabricCanvas.add(stamp)
    clampStampBoundsAndCenter(
      fabricCanvas,
      stamp,
      stageSizeRef.current.w,
      stageSizeRef.current.h,
      {
        snap:
          snapToPresetsEnabledRef.current
            ? {
                enabled: true,
                presets: STAMP_SNAP_PRESETS,
                commitThreshold: STAMP_SNAP_COMMIT_THRESHOLD_PX,
                previewThreshold: STAMP_SNAP_PREVIEW_THRESHOLD_PX,
              }
            : undefined,
      },
    )

    const buildSnapOptions = (growSnapPreview: boolean) =>
      snapToPresetsEnabledRef.current
        ? {
            enabled: true as const,
            presets: STAMP_SNAP_PRESETS,
            commitThreshold: STAMP_SNAP_COMMIT_THRESHOLD_PX,
            previewThreshold: growSnapPreview
              ? STAMP_SNAP_PREVIEW_THRESHOLD_PX
              : STAMP_SNAP_COMMIT_THRESHOLD_PX,
          }
        : undefined

    const syncStampScreenRect = () => {
      const { w, h } = stageSizeRef.current
      const rw = fabricCanvas.getWidth()
      const rh = fabricCanvas.getHeight()
      setStampRect(centeredStampScreenRect(w, h, rw, rh))
    }

    const syncChromeIfActive = () => {
      if (fabricCanvas.getActiveObject() !== stamp) return
      const next = readChromeFromStamp(stamp)
      setChromeRect((prev) => (chromeEqual(prev, next) ? prev : next))
    }

    const syncFrameTravelOverlay = () => {
      const active = fabricCanvas.getActiveObject()
      if (!isFrameObject(active)) {
        setFrameTravelRect(null)
        return
      }
      setFrameTravelRect(readFrameTravelRectFabric(stamp, active))
    }

    const runClampSync = ({
      previewSnapOutline,
    }: {
      previewSnapOutline: boolean
    }) => {
      const preA =
        Math.round(stamp.getScaledWidth()) * Math.round(stamp.getScaledHeight())
      const isGrowing =
        resizeGestureStartAreaRef.current <= 0 ||
        preA > resizeGestureStartAreaRef.current

      const { w, h } = stageSizeRef.current
      const { snapPreview } = clampStampBoundsAndCenter(
        fabricCanvas,
        stamp,
        w,
        h,
        { snap: buildSnapOptions(isGrowing) },
      )
      if (previewSnapOutline) {
        setSnapGuide(
          snapPreview
            ? {
                w: snapPreview.w,
                h: snapPreview.h,
                expanded: isGrowing,
              }
            : null,
        )
      }
      syncChromeIfActive()
      syncStampScreenRect()
      syncFrameTravelOverlay()
      fabricCanvas.requestRenderAll()
    }

    syncStampScreenRect()

    fabricCanvas.discardActiveObject()
    fabricCanvas.requestRenderAll()

    const showChrome = () => {
      const currentActive = fabricCanvas.getActiveObject()
      if (isFrameObject(currentActive)) return
      if (isTextObject(currentActive)) return
      if (currentActive !== stamp) {
        fabricCanvas.setActiveObject(stamp)
      }
      const next = readChromeFromStamp(stamp)
      setChromeRect((prev) => (chromeEqual(prev, next) ? prev : next))
      fabricCanvas.requestRenderAll()
    }

    const hideChrome = () => {
      if (fabricCanvas.getActiveObject() === stamp) {
        fabricCanvas.discardActiveObject()
      }
      setChromeRect(null)
      setSnapGuide(null)
      fabricCanvas.requestRenderAll()
    }

    const CORNER_RESIZE_MARGIN_PX = 48

    const onMouseMove = (opt: TPointerEventInfo) => {
      const currentActive = fabricCanvas.getActiveObject()
      if (isFrameObject(currentActive)) return
      if (isTextObject(currentActive)) return

      const scene = { x: opt.scenePoint.x, y: opt.scenePoint.y }

      if (!pointerOnStampCanvas(fabricCanvas, opt)) {
        if (!isStampResizingRef.current) hideChrome()
        return
      }

      const nearCorner = isNearStampResizeCorner(
        stamp,
        scene,
        CORNER_RESIZE_MARGIN_PX,
      )
      const dragging = pointerButtonsDown(opt.e)

      if (
        nearCorner ||
        (dragging && fabricCanvas.getActiveObject() === stamp)
      ) {
        showChrome()
        return
      }

      if (
        fabricCanvas.getActiveObject() === stamp &&
        !isStampResizingRef.current
      ) {
        fabricCanvas.discardActiveObject()
        setChromeRect(null)
        setSnapGuide(null)
        fabricCanvas.requestRenderAll()
      }
    }

    const onSelectionChange = () => {
      const active = fabricCanvas.getActiveObject()
      setSelectedTextIdRef.current(readTextLayerId(active))
      syncFrameTravelOverlay()
    }

    const onObjectMoving = () => {
      syncFrameTravelOverlay()
    }

    const onObjectScaling = () => {
      syncFrameTravelOverlay()
    }

    const onObjectModifiedCanvas = () => {
      const active = fabricCanvas.getActiveObject()
      const tid = readTextLayerId(active)
      if (tid && isTextObject(active)) {
        updateTextLayerRef.current(
          tid,
          { content: active.text ?? '' },
          { syncToFabric: false },
        )
      }
      syncFrameTravelOverlay()
    }

    const onStampScaleStart = () => {
      isStampResizingRef.current = true
      resizeGestureStartAreaRef.current =
        Math.round(stamp.getScaledWidth()) *
        Math.round(stamp.getScaledHeight())
    }

    const onStampScaling = () => {
      runClampSync({ previewSnapOutline: true })
    }

    const onStampBoundsModified = () => {
      isStampResizingRef.current = false
      resizeGestureStartAreaRef.current = 0
      setSnapGuide(null)
      runClampSync({ previewSnapOutline: false })
      userDesiredStampSizeRef.current = {
        w: fabricCanvas.getWidth(),
        h: fabricCanvas.getHeight(),
      }
    }

    const onPlacementMouseDown = (opt: TPointerEventInfo) => {
      if (!textPlacementActiveRef.current) return
      if (!pointerOnStampCanvas(fabricCanvas, opt)) return
      stamp.setCoords()
      const p = new Point(opt.scenePoint.x, opt.scenePoint.y)
      if (!stamp.containsPoint(p)) return

      fabricCanvas.discardActiveObject()
      addTextLayerAtSceneRef.current(opt.scenePoint.x, opt.scenePoint.y)
      fabricCanvas.requestRenderAll()
    }

    /** Runs after Fabric’s own cursor logic on `mouse:move` — keeps I-beam during text placement. */
    const onTextPlacementCursor = () => {
      if (textPlacementActiveRef.current) {
        fabricCanvas.setCursor('text')
      }
    }

    stamp.on('scaling', onStampScaleStart)
    stamp.on('scaling', onStampScaling)
    stamp.on('modified', onStampBoundsModified)

    fabricCanvas.on('mouse:down', onPlacementMouseDown)
    fabricCanvas.on('mouse:move', onMouseMove)
    fabricCanvas.on('mouse:move', onTextPlacementCursor)
    fabricCanvas.on('selection:created', onSelectionChange)
    fabricCanvas.on('selection:updated', onSelectionChange)
    fabricCanvas.on('selection:cleared', onSelectionChange)
    fabricCanvas.on('object:moving', onObjectMoving)
    fabricCanvas.on('object:scaling', onObjectScaling)
    fabricCanvas.on('object:modified', onObjectModifiedCanvas)

    const syncTextOverlay = () => {
      const overlay = textOverlayRef.current
      if (!overlay || !activeShaderRef.current) return
      const textObjs = getAllTextObjects(stamp)
      if (textObjs.length === 0) return
      const nonTextObjs = stamp.getObjects().filter((obj) => !isTextObject(obj))
      const savedVis = nonTextObjs.map((obj) => obj.visible)
      nonTextObjs.forEach((obj) => { obj.visible = false })
      const tempEl = fabricCanvas.toCanvasElement()
      nonTextObjs.forEach((obj, i) => { obj.visible = savedVis[i]! })
      overlay.width = tempEl.width
      overlay.height = tempEl.height
      const ctx = overlay.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, overlay.width, overlay.height)
        ctx.drawImage(tempEl, 0, 0)
      }
    }
    fabricCanvas.on('after:render', syncTextOverlay)

    fabricRef.current = fabricCanvas
    stampRef.current = stamp
    const exportCompositedRaster: NonNullable<
      Parameters<typeof register>[0]['exportCompositedRaster']
    > = async ({ format, multiplier, quality, perforationCount: perfCount }) => {
      const content = contentRef.current
      const stampBounds = stampRectRef.current
      if (!content || !stampBounds) return null

      /** Avoid baking selection handles into the raster if a text/frame was still active. */
      fabricCanvas.discardActiveObject()
      fabricCanvas.requestRenderAll()

      const outW = Math.max(1, Math.round(stampBounds.width * multiplier))
      const outH = Math.max(1, Math.round(stampBounds.height * multiplier))

      const out = document.createElement('canvas')
      out.width = outW
      out.height = outH
      const ctx = out.getContext('2d')
      if (!ctx) return null

      if (format === 'jpeg') {
        ctx.fillStyle = '#141416'
        ctx.fillRect(0, 0, outW, outH)
      }

      const shaderCanvas = content.querySelector(
        'canvas:not(.lower-canvas):not(.upper-canvas):not(.stampstudio-text-overlay)',
      ) as HTMLCanvasElement | null

      const fabricLower = content.querySelector(
        'canvas.lower-canvas',
      ) as HTMLCanvasElement | null
      if (fabricLower && fabricLower.width > 0 && fabricLower.height > 0) {
        ctx.drawImage(
          fabricLower,
          0,
          0,
          fabricLower.width,
          fabricLower.height,
          0,
          0,
          outW,
          outH,
        )
      }

      if (shaderCanvas && shaderCanvas.width > 0 && shaderCanvas.height > 0) {
        ctx.globalCompositeOperation = 'multiply'
        ctx.drawImage(
          shaderCanvas,
          0,
          0,
          shaderCanvas.width,
          shaderCanvas.height,
          0,
          0,
          outW,
          outH,
        )
        ctx.globalCompositeOperation = 'source-over'

        // Redraw text clean on top so shader doesn't affect it
        const textObjs = getAllTextObjects(stamp)
        if (textObjs.length > 0) {
          const nonTextObjs = stamp.getObjects().filter((obj) => !isTextObject(obj))
          const savedVis = nonTextObjs.map((obj) => obj.visible)
          nonTextObjs.forEach((obj) => { obj.visible = false })
          const textOnlyEl = fabricCanvas.toCanvasElement()
          nonTextObjs.forEach((obj, i) => { obj.visible = savedVis[i]! })
          ctx.drawImage(textOnlyEl, 0, 0, textOnlyEl.width, textOnlyEl.height, 0, 0, outW, outH)
        }
      }

      ctx.save()
      ctx.scale(multiplier, multiplier)
      punchPerforationHoles(ctx, stampBounds.width, stampBounds.height, perfCount)
      ctx.restore()

      return out.toDataURL(
        format === 'jpeg' ? 'image/jpeg' : 'image/png',
        quality,
      )
    }

    const applySizePreset: NonNullable<
      StampCanvasApi['applySizePreset']
    > = (targetW, targetH) => {
      const tw = Math.max(1, Math.round(targetW))
      const th = Math.max(1, Math.round(targetH))
      stamp.set({
        scaleX: tw / STAMP_BASE_WIDTH,
        scaleY: th / STAMP_BASE_HEIGHT,
      })
      stamp.setCoords()
      const { w, h } = stageSizeRef.current
      clampStampBoundsAndCenter(fabricCanvas, stamp, w, h)
      fabricCanvas.requestRenderAll()
      syncStampScreenRect()
      syncChromeIfActive()
      setSnapGuide(null)
      return {
        width: fabricCanvas.getWidth(),
        height: fabricCanvas.getHeight(),
      }
    }

    register({
      canvas: fabricCanvas,
      stamp,
      applySizePreset,
      exportCompositedRaster,
    })

    return () => {
      stamp.off('modified', onStampBoundsModified)
      stamp.off('scaling', onStampScaling)
      stamp.off('scaling', onStampScaleStart)
      fabricCanvas.off('mouse:down', onPlacementMouseDown)
      fabricCanvas.off('mouse:move', onMouseMove)
      fabricCanvas.off('mouse:move', onTextPlacementCursor)
      fabricCanvas.off('selection:created', onSelectionChange)
      fabricCanvas.off('selection:updated', onSelectionChange)
      fabricCanvas.off('selection:cleared', onSelectionChange)
      fabricCanvas.off('object:moving', onObjectMoving)
      fabricCanvas.off('object:scaling', onObjectScaling)
      fabricCanvas.off('object:modified', onObjectModifiedCanvas)
      fabricCanvas.off('after:render', syncTextOverlay)
      unregister()
      fabricCanvas.dispose()
      fabricRef.current = null
      stampRef.current = null
      setChromeRect(null)
      setSnapGuide(null)
      setFrameTravelRect(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; stage size handled below
  }, [register, unregister])

  useEffect(() => {
    const c = fabricRef.current
    const s = stampRef.current
    if (!c || !s) return
    // Restore desired size before clamping so the stamp can grow back when the
    // stage expands again — without this, each shrink permanently reduces the scale.
    const desired = userDesiredStampSizeRef.current
    s.set({
      scaleX: desired.w / STAMP_BASE_WIDTH,
      scaleY: desired.h / STAMP_BASE_HEIGHT,
    })
    clampStampBoundsAndCenter(c, s, stageW, stageH, {
      snap: snapToPresetsEnabledRef.current
        ? {
            enabled: true,
            presets: STAMP_SNAP_PRESETS,
            commitThreshold: STAMP_SNAP_COMMIT_THRESHOLD_PX,
            previewThreshold: STAMP_SNAP_PREVIEW_THRESHOLD_PX,
          }
        : undefined,
    })
    const rw = c.getWidth()
    const rh = c.getHeight()
    setStampRect(centeredStampScreenRect(stageW, stageH, rw, rh))
    c.requestRenderAll()
    if (c.getActiveObject() === s) {
      const next = readChromeFromStamp(s)
      setChromeRect((prev) => (chromeEqual(prev, next) ? prev : next))
    }
    const active = c.getActiveObject()
    if (isFrameObject(active)) {
      setFrameTravelRect(readFrameTravelRectFabric(s, active))
    } else {
      setFrameTravelRect(null)
    }
  }, [stageW, stageH])

  const shaderRect =
    stampRect === null
      ? null
      : {
          left: 0,
          top: 0,
          width: stampRect.width,
          height: stampRect.height,
        }

  return (
    <div ref={wrapRef} className="relative h-full min-h-0 w-full min-w-0 flex-1">
      <div
        ref={stageRef}
        className="relative h-full min-h-0 w-full overflow-hidden bg-[#141416]"
      >
        <StampPerforations
          width={stampRect?.width ?? 0}
          height={stampRect?.height ?? 0}
          userDensity={outlineMode ? 0 : perforationCount}
        />

        {stampRect ? (
          <div
            className={`absolute z-0 rounded-sm ${
              outlineMode
                ? 'ring-1 ring-inset ring-white/50'
                : 'ring-1 ring-inset ring-zinc-600/50'
            }`}
            style={{
              left: stampRect.left,
              top: stampRect.top,
              width: stampRect.width,
              height: stampRect.height,
              boxSizing: 'border-box',
              transform: canvasZoom !== 1 ? `scale(${canvasZoom})` : undefined,
            }}
          >
            <div
              ref={contentRef}
              className="relative flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[2px]"
              style={{
                clipPath:
                  perforationCount > 0
                    ? 'url(#stamp-perf-clip)'
                    : undefined,
              }}
              onPointerLeave={() => {
                if (isStampResizingRef.current) return
                const c = fabricRef.current
                const s = stampRef.current
                if (!c || !s) return
                const a = c.getActiveObject()
                if (isFrameObject(a) || isTextObject(a)) return
                if (c.getActiveObject() === s) {
                  c.discardActiveObject()
                }
                setChromeRect(null)
                setSnapGuide(null)
                c.requestRenderAll()
              }}
            >
              <ShaderLayer
                rect={shaderRect}
                imageSrc={backgroundAsset?.src ?? ''}
                stampColor={stampColor}
                activeShader={outlineMode ? null : activeShader}
                shaderParams={shaderParams}
              />
              <div
                className="pointer-events-auto relative z-20 min-h-0 min-w-0 flex-1"
              >
                <canvas ref={canvasElRef} className="block h-full w-full" />
              </div>
              <canvas
                ref={textOverlayRef}
                className={`stampstudio-text-overlay pointer-events-none absolute inset-0 z-40 h-full w-full ${
                  outlineMode ? 'opacity-0' : ''
                }`}
              />

              {frameTravelRect && !outlineMode ? (
                <div
                  className="pointer-events-none absolute inset-0 z-[15] border border-red-500/90"
                  style={{
                    left: frameTravelRect.left,
                    top: frameTravelRect.top,
                    width: Math.max(0, frameTravelRect.width),
                    height: Math.max(0, frameTravelRect.height),
                    boxShadow: '0 0 0 1px rgba(239,68,68,0.22) inset',
                  }}
                />
              ) : null}
            </div>

            <AnimatePresence>
              {snapGuide && stampRect && !outlineMode ? (
                <motion.div
                  key={`snap-guide-${snapGuide.w}-${snapGuide.h}-${snapGuide.expanded ? 'e' : 'c'}`}
                  layout
                  className="pointer-events-none absolute z-[14] rounded-[3px]"
                  aria-hidden="true"
                  style={(() => {
                    const o = snapGuide.expanded
                      ? STAMP_SNAP_GUIDE_OUTSET_PX
                      : 0
                    return {
                      left: (stampRect.width - snapGuide.w - o * 2) / 2,
                      top: (stampRect.height - snapGuide.h - o * 2) / 2,
                      width: snapGuide.w + o * 2,
                      height: snapGuide.h + o * 2,
                      boxSizing: 'border-box' as const,
                      border: snapGuide.expanded
                        ? '2px dashed rgba(255, 255, 255, 0.55)'
                        : '1px dashed rgba(255, 255, 255, 0.42)',
                      boxShadow: snapGuide.expanded
                        ? '0 0 0 1px rgba(255, 255, 255, 0.12)'
                        : 'none',
                    }
                  })()}
                  initial={{ opacity: 0, scale: 0.988 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.988 }}
                  transition={{ duration: 0.11, ease: [0.22, 1, 0.36, 1] }}
                />
              ) : null}
            </AnimatePresence>

            <div className={`pointer-events-none absolute inset-0 z-[21] ${outlineMode ? 'opacity-0' : ''}`}>
              <StampResizeChromeOverlay rect={chromeRect} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
