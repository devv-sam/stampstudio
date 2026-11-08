import {
  ActiveSelection,
  Canvas,
  Point,
  type FabricObject,
  type TPointerEventInfo,
} from 'fabric'
import type { Group } from 'fabric'
import { useDialKit } from 'dialkit'
import { motion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { useCanvasSize } from '../../hooks/useCanvas'
import { useDeskMotion } from '../../utils/deskMotion'
import { useStampEditor } from '../../hooks/useStampEditor'
import type { TextLayer } from '../../types/text'
import type { StampCanvasApi } from '../../types/canvas'
import {
  disableStampControls,
  capScaleToStamp,
  clampStampBoundsAndCenter,
  setStampArtboard,
  createStampGroup,
  STAMP_BASE_HEIGHT,
  STAMP_BASE_WIDTH,
  STAMP_MAX_CANVAS_FRACTION,
  STAMP_SAFE_INSET,
  STAMP_MIN_SIDE,
} from '../../utils/fabricHelpers'
import { FRAME_OBJECT_TAG } from '../../utils/stampImageHelpers'
import {
  constrainTextInGroup,
  findTextByLayerId,
  getAllTextObjects,
  isTextObject,
  readTextLayerId,
} from '../../utils/textHelpers'
import { blendShaderOverFill, isMixMode } from '../../utils/blendModes'
import { punchPerforationHoles } from '../../utils/exportHelpers'
import { solidColorDataUrl } from '../../utils/solidColorDataUrl'
import { buildPerforationClipPathD } from '../../utils/stampPerforationLayout'
import { applyOutlineMode, restoreOutlineMode } from '../../utils/outlineMode'
import { StampSizeHud } from '../Layout/StampSizeHud'
import { ShaderLayer } from './ShaderLayer'
import { ShaderOriginGizmo } from './ShaderOriginGizmo'
import { StampResizeEdges } from './StampResizeEdges'

const TEXT_MIN_SIZE = 6
const TEXT_MAX_SIZE = 200
const DESK_FILL = 0.82
const DESK_MAX_SCALE = 1.7
// shortcut: linear and oklab blend on the cpu, so they export at this size at most, move them to webgl if the softness shows
const MIX_MAX_SIDE = 2400
const STAMP_SHADOW =
  'drop-shadow(0 1px 2px rgb(0 0 0 / 0.12)) drop-shadow(0 16px 24px rgb(0 0 0 / 0.14))'

// view-only and fixed per stage, so resizing tracks the pointer and sizes read true
type ShaderRenderer = {
  setMaxPixelCount: (count?: number) => void
  setMinPixelRatio: (ratio?: number) => void
}

function stageViewScale(stageW: number, stageH: number) {
  return Math.min(
    DESK_MAX_SCALE,
    Math.max(
      1,
      Math.min(
        (stageW * DESK_FILL) / STAMP_BASE_WIDTH,
        (stageH * DESK_FILL) / STAMP_BASE_HEIGHT,
      ),
    ),
  )
}

function roomForStamp(stageW: number, stageH: number) {
  const scale = stageViewScale(stageW, stageH)
  return { w: stageW / scale, h: stageH / scale }
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

  const [stampRect, setStampRect] = useState<RectBounds | null>(() =>
    centeredStampScreenRect(800, 600, 420, 300),
  )
  const [frameTravelRect, setFrameTravelRect] = useState<RectBounds | null>(
    null,
  )
  const stampRectRef = useRef<RectBounds | null>(stampRect)

  const {
    register,
    unregister,
    perforationCount,
    activeShader,
    shaderParams,
    blendMode,
    backgroundAsset,
    frameAssets,
    stampColor,
    setSelectedTextId,
    updateTextLayer,
    selectedTextId,
    textLayers,
    textPlacementActive,
    addTextLayerAtScene,
    canvasZoom,
    setCanvasZoom,
    outlineMode,
    setStampSize,
    removeTextLayer,
    setAssetRole,
  } = useStampEditor()

  const { scale: defaultScale } = useDialKit(
    'Default stamp',
    { scale: [0.65, 0.3, 2, 0.05] },
    { id: 'default-stamp-scale', persist: true },
  )

  // the stamp sizes itself across the first frames, only spring after that
  const [settled, setSettled] = useState(false)
  const [resizing, setResizing] = useState(false)
  useEffect(() => {
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setSettled(true))
    })
    return () => cancelAnimationFrame(id)
  }, [])
  const { springy } = useDeskMotion()

  const canvasZoomRef = useRef(canvasZoom)
  const textOverlayRef = useRef<HTMLCanvasElement>(null)
  const activeShaderRef = useRef(activeShader)
  const shaderBlendRef = useRef({ blendMode, fill: '' })
  shaderBlendRef.current = {
    blendMode,
    fill: backgroundAsset?.src ?? solidColorDataUrl(stampColor),
  }

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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return
      const el = e.target as HTMLElement
      // fabric types into a hidden textarea, so this also skips in-place text editing
      if (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
        return
      }
      const c = fabricRef.current
      const active = c?.getActiveObject()
      if (!c || !active) return
      const targets =
        active instanceof ActiveSelection ? active.getObjects() : [active]
      e.preventDefault()
      c.discardActiveObject()
      for (const obj of targets) {
        const textId = readTextLayerId(obj)
        if (textId) removeTextLayer(textId)
        else if (isFrameObject(obj)) {
          const { stampstudioAssetId: id } = obj as typeof obj & {
            stampstudioAssetId?: string
          }
          if (id) void setAssetRole(id, 'unused')
        }
      }
      c.requestRenderAll()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [removeTextLayer, setAssetRole])

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (
        !target ||
        contentRef.current?.contains(target) ||
        target.closest('[data-text-panel], .chrome-picker')
      ) {
        return
      }
      const c = fabricRef.current
      if (!c?.getActiveObject()) return
      c.discardActiveObject()
      c.requestRenderAll()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

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
      uniformScaling: true,
      selectionColor: 'rgba(59, 132, 238, 0.12)',
      selectionBorderColor: '#3b84ee',
      selectionLineWidth: 1,
    })

    // draw at on-screen size, the stage's css scale would otherwise blur the canvas
    fabricCanvas.getRetinaScaling = () =>
      window.devicePixelRatio *
      stageViewScale(stageSizeRef.current.w, stageSizeRef.current.h)

    const stamp = createStampGroup()
    disableStampControls(stamp)
    fabricCanvas.add(stamp)
    const initialRoom = roomForStamp(
      stageSizeRef.current.w,
      stageSizeRef.current.h,
    )
    clampStampBoundsAndCenter(fabricCanvas, stamp, initialRoom.w, initialRoom.h)

    const syncStampScreenRect = () => {
      const { w, h } = stageSizeRef.current
      const rw = fabricCanvas.getWidth()
      const rh = fabricCanvas.getHeight()
      setStampRect(centeredStampScreenRect(w, h, rw, rh))
    }

    const syncFrameTravelOverlay = () => {
      const active = fabricCanvas.getActiveObject()
      if (!isFrameObject(active)) {
        setFrameTravelRect(null)
        return
      }
      setFrameTravelRect(readFrameTravelRectFabric(stamp, active))
    }

    const runClampSync = () => {
      const room = roomForStamp(stageSizeRef.current.w, stageSizeRef.current.h)
      clampStampBoundsAndCenter(fabricCanvas, stamp, room.w, room.h)
      syncStampScreenRect()
      syncFrameTravelOverlay()
      // resizing the canvas clears it, so paint now rather than next frame
      fabricCanvas.renderAll()
    }

    syncStampScreenRect()

    fabricCanvas.discardActiveObject()
    fabricCanvas.requestRenderAll()

    const onSelectionChange = () => {
      const active = fabricCanvas.getActiveObject()
      setSelectedTextIdRef.current(readTextLayerId(active))
      syncFrameTravelOverlay()
    }

    const onObjectMoving = () => {
      syncFrameTravelOverlay()
    }

    const onObjectScaling = ({
      target,
      transform,
    }: {
      target: FabricObject
      transform: { corner: string }
    }) => {
      const axis = { ml: 'x', mr: 'x', mt: 'y', mb: 'y' }[transform.corner] as
        | 'x'
        | 'y'
        | undefined
      capScaleToStamp(
        target,
        stamp,
        isFrameObject(target) ? 0 : STAMP_SAFE_INSET,
        axis,
      )
      syncFrameTravelOverlay()
    }

    const onObjectModifiedCanvas = () => {
      const active = fabricCanvas.getActiveObject()
      const tid = readTextLayerId(active)
      if (tid && isTextObject(active)) {
        // height becomes the font size so text stays real type, only a side drag leaves any stretch
        const fontSize = Math.round(
          Math.min(
            TEXT_MAX_SIZE,
            Math.max(TEXT_MIN_SIZE, active.fontSize * active.scaleY),
          ),
        )
        active.set({
          fontSize,
          scaleX: active.scaleX / active.scaleY,
          scaleY: 1,
        })
        active.initDimensions()
        active.setCoords()
        updateTextLayerRef.current(
          tid,
          { content: active.text ?? '', fontSize },
          { syncToFabric: false },
        )
      }
      syncFrameTravelOverlay()
    }

    const onStampScaling = () => {
      getAllTextObjects(stamp).forEach(constrainTextInGroup)
      runClampSync()
    }

    const onStampBoundsModified = () => {
      runClampSync()
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

    let marqueeStart: Point | null = null

    const onMarqueeDown = (opt: TPointerEventInfo) => {
      const onObject = isTextObject(opt.target) || isFrameObject(opt.target)
      marqueeStart =
        onObject || textPlacementActiveRef.current ? null : opt.scenePoint
    }

    const onMarqueeUp = (opt: TPointerEventInfo) => {
      const start = marqueeStart
      marqueeStart = null
      if (!start || start.distanceFrom(opt.scenePoint) < 3) return
      const topLeft = new Point(
        Math.min(start.x, opt.scenePoint.x),
        Math.min(start.y, opt.scenePoint.y),
      )
      const bottomRight = new Point(
        Math.max(start.x, opt.scenePoint.x),
        Math.max(start.y, opt.scenePoint.y),
      )
      const hits = stamp
        .getObjects()
        .filter(
          (o) =>
            (isTextObject(o) || isFrameObject(o)) &&
            (o.intersectsWithRect(topLeft, bottomRight) ||
              o.isContainedWithinRect(topLeft, bottomRight)),
        )
      if (hits.length === 0) return
      fabricCanvas.setActiveObject(
        hits.length === 1
          ? hits[0]!
          : new ActiveSelection(hits, { canvas: fabricCanvas }),
      )
      fabricCanvas.requestRenderAll()
    }

    stamp.on('scaling', onStampScaling)
    stamp.on('modified', onStampBoundsModified)

    fabricCanvas.on('mouse:down', onPlacementMouseDown)
    fabricCanvas.on('mouse:down', onMarqueeDown)
    fabricCanvas.on('mouse:up', onMarqueeUp)
    fabricCanvas.on('mouse:move', onTextPlacementCursor)
    fabricCanvas.on('selection:created', onSelectionChange)
    fabricCanvas.on('selection:updated', onSelectionChange)
    fabricCanvas.on('selection:cleared', onSelectionChange)
    fabricCanvas.on('object:moving', onObjectMoving)
    fabricCanvas.on('object:scaling', onObjectScaling)
    fabricCanvas.on('object:modified', onObjectModifiedCanvas)

    let syncingOverlay = false
    const syncTextOverlay = () => {
      const overlay = textOverlayRef.current
      // toCanvasElement fires after:render, so without this guard it recurses
      if (syncingOverlay || !overlay || !activeShaderRef.current) return
      const textObjs = getAllTextObjects(stamp)
      if (textObjs.length === 0) return
      const nonTextObjs = stamp.getObjects().filter((obj) => !isTextObject(obj))
      const savedVis = nonTextObjs.map((obj) => obj.visible)
      nonTextObjs.forEach((obj) => { obj.visible = false })
      syncingOverlay = true
      const tempEl = fabricCanvas.toCanvasElement(
        fabricCanvas.getRetinaScaling(),
      )
      syncingOverlay = false
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

      // paint fresh at export size, the on-screen canvas would upscale soft
      ctx.drawImage(fabricCanvas.toCanvasElement(multiplier), 0, 0, outW, outH)

      if (shaderCanvas && shaderCanvas.width > 0 && shaderCanvas.height > 0) {
        const { blendMode: mode, fill } = shaderBlendRef.current
        // the shader canvas is sized for the screen, so render it again at the export size
        const mount = (
          shaderCanvas.parentElement as
            | (HTMLElement & { paperShaderMount?: ShaderRenderer })
            | null
        )?.paperShaderMount
        const longSide = Math.max(stampBounds.width, stampBounds.height)
        mount?.setMaxPixelCount(outW * outH)
        mount?.setMinPixelRatio(
          isMixMode(mode) ? Math.min(multiplier, MIX_MAX_SIDE / longSide) : multiplier,
        )
        const shaderLayer = await blendShaderOverFill(shaderCanvas, fill, mode)
        ctx.globalCompositeOperation = 'multiply'
        ctx.drawImage(
          shaderLayer,
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
        mount?.setMinPixelRatio()
        mount?.setMaxPixelCount()

        // Redraw text clean on top so shader doesn't affect it
        const textObjs = getAllTextObjects(stamp)
        if (textObjs.length > 0) {
          const nonTextObjs = stamp.getObjects().filter((obj) => !isTextObject(obj))
          const savedVis = nonTextObjs.map((obj) => obj.visible)
          nonTextObjs.forEach((obj) => { obj.visible = false })
          const textOnlyEl = fabricCanvas.toCanvasElement(multiplier)
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

    const setSize: NonNullable<
      StampCanvasApi['setSize']
    > = (targetW, targetH) => {
      const tw = Math.max(1, Math.round(targetW))
      const th = Math.max(1, Math.round(targetH))
      setStampArtboard(stamp, tw, th)
      stamp.setCoords()
      const room = roomForStamp(stageSizeRef.current.w, stageSizeRef.current.h)
      clampStampBoundsAndCenter(fabricCanvas, stamp, room.w, room.h)
      fabricCanvas.requestRenderAll()
      syncStampScreenRect()
      userDesiredStampSizeRef.current = {
        w: fabricCanvas.getWidth(),
        h: fabricCanvas.getHeight(),
      }
      return {
        width: fabricCanvas.getWidth(),
        height: fabricCanvas.getHeight(),
      }
    }

    register({
      canvas: fabricCanvas,
      stamp,
      setSize,
      exportCompositedRaster,
    })

    return () => {
      stamp.off('modified', onStampBoundsModified)
      stamp.off('scaling', onStampScaling)
      fabricCanvas.off('mouse:down', onPlacementMouseDown)
      fabricCanvas.off('mouse:down', onMarqueeDown)
      fabricCanvas.off('mouse:up', onMarqueeUp)
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
      setFrameTravelRect(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; stage size handled below
  }, [register, unregister])

  useEffect(() => {
    const w = Math.round(STAMP_BASE_WIDTH * defaultScale)
    const h = Math.round(STAMP_BASE_HEIGHT * defaultScale)
    userDesiredStampSizeRef.current = { w, h }
    setStampSize(w, h)
  }, [defaultScale, setStampSize])

  useEffect(() => {
    const c = fabricRef.current
    const s = stampRef.current
    if (!c || !s) return
    // Restore desired size before clamping so the stamp can grow back when the
    // stage expands again — without this, each shrink permanently reduces the scale.
    const desired = userDesiredStampSizeRef.current
    // shrink both axes together so a narrow stage doesn't squash the stamp
    const room = roomForStamp(stageW, stageH)
    const fit = Math.min(
      1,
      (room.w * STAMP_MAX_CANVAS_FRACTION) / desired.w,
      (room.h * STAMP_MAX_CANVAS_FRACTION) / desired.h,
    )
    setStampArtboard(s, desired.w * fit, desired.h * fit)
    clampStampBoundsAndCenter(c, s, room.w, room.h)
    const rw = c.getWidth()
    const rh = c.getHeight()
    setStampRect(centeredStampScreenRect(stageW, stageH, rw, rh))
    // the provider's size readout listens to stamp events, this clamp fires none
    s.fire('moving', {} as never)
    c.requestRenderAll()
    const active = c.getActiveObject()
    if (isFrameObject(active)) {
      setFrameTravelRect(readFrameTravelRectFabric(s, active))
    } else {
      setFrameTravelRect(null)
    }
  }, [stageW, stageH])

  const viewScale = stageViewScale(stageW, stageH)
  const room = roomForStamp(stageW, stageH)

  const resizeStamp = (width: number, height: number) => {
    const s = stampRef.current
    if (!s) return
    setResizing(true)
    setStampArtboard(s, width, height)
    s.fire('scaling', {} as never)
  }

  const finishStampResize = () => {
    setResizing(false)
    stampRef.current?.fire('modified', {} as never)
  }

  // inline path() so holes land in the same frame as the size, an svg url() clip repaints a frame late
  const perforationClip =
    stampRect && perforationCount > 0 && !outlineMode
      ? `path(evenodd, "${buildPerforationClipPathD(stampRect.width, stampRect.height, perforationCount)}")`
      : undefined

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
        className="relative h-full min-h-0 w-full"
      >
        {stampRect ? (
          <motion.div
            className={`absolute z-0 rounded-[2px] ${
              outlineMode ? 'ring-1 ring-inset ring-ink/50' : ''
            }`}
            style={{
              left: stampRect.left,
              top: stampRect.top,
              width: stampRect.width,
              height: stampRect.height,
              boxSizing: 'border-box',
              visibility: settled ? 'visible' : 'hidden',
              filter: outlineMode
                ? undefined
                : STAMP_SHADOW,
            }}
            initial={false}
            animate={{ scale: canvasZoom * viewScale }}
            transition={settled ? springy : { duration: 0 }}
          >
            <div
              ref={contentRef}
              className="relative flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[2px]"
              style={{
                clipPath: perforationClip,
              }}
            >
              <ShaderLayer
                rect={shaderRect}
                imageSrc={backgroundAsset?.src ?? ''}
                stampColor={stampColor}
                activeShader={outlineMode ? null : activeShader}
                shaderParams={shaderParams}
                blendMode={blendMode}
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

            <ShaderOriginGizmo scale={canvasZoom * viewScale} />

            {outlineMode ? null : (
              <StampResizeEdges
                width={stampRect.width}
                height={stampRect.height}
                scale={canvasZoom * viewScale}
                minSide={STAMP_MIN_SIDE}
                maxWidth={room.w * STAMP_MAX_CANVAS_FRACTION}
                maxHeight={room.h * STAMP_MAX_CANVAS_FRACTION}
                onResize={resizeStamp}
                onEnd={finishStampResize}
              />
            )}
          </motion.div>
        ) : null}

        {stampRect ? (
          <motion.div
            className="pointer-events-none absolute text-center"
            style={{
              left: stampRect.left,
              width: stampRect.width,
              visibility: settled ? 'visible' : 'hidden',
            }}
            initial={false}
            animate={{
              opacity: resizing ? 0 : 1,
              top:
                stampRect.top +
                stampRect.height / 2 +
                (stampRect.height / 2) * canvasZoom * viewScale +
                22,
            }}
            transition={{
              opacity: { duration: 0.12 },
              top: settled && !resizing ? springy : { duration: 0 },
            }}
          >
            <StampSizeHud />
          </motion.div>
        ) : null}
      </div>
    </div>
  )
}
