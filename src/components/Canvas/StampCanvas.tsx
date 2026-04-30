import { Canvas, Point, type FabricObject } from 'fabric'
import type { Group } from 'fabric'
import { useEffect, useRef, useState } from 'react'

import { useCanvasSize } from '../../hooks/useCanvas'
import { useStampEditor } from '../../hooks/useStampEditor'
import {
  applyStampResizeHandles,
  clampStampBoundsAndCenter,
  createStampGroup,
} from '../../utils/fabricHelpers'
import { FRAME_OBJECT_TAG } from '../../utils/stampImageHelpers'
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

function pointerOnStamp(
  stamp: Group,
  opt: { scenePoint: { x: number; y: number }; target?: FabricObject },
) {
  if (opt.target === stamp) return true
  const { x, y } = opt.scenePoint
  return stamp.containsPoint(new Point(x, y))
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
 * Read the selected frame's movement envelope in canvas coordinates.
 *
 * For UX clarity, the visible travel boundary is the stamp bounds themselves:
 * users expect "frame can't leave this red box" to map to the stamp area, not
 * an inset center-clamp rectangle.
 */
function readFrameTravelRect(stamp: Group, frame: FabricObject): RectBounds {
  stamp.setCoords()
  const stampBounds = stamp.getBoundingRect()
  void frame
  return {
    left: stampBounds.left,
    top: stampBounds.top,
    width: stampBounds.width,
    height: stampBounds.height,
  }
}

export function StampCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const stampRef = useRef<ReturnType<typeof createStampGroup> | null>(
    null,
  )

  const [chromeRect, setChromeRect] = useState<ChromeRect | null>(null)
  const [stampRect, setStampRect] = useState<RectBounds | null>({
    left: 100,
    top: 100,
    width: 420,
    height: 300,
  })
  const [frameTravelRect, setFrameTravelRect] = useState<RectBounds | null>(null)

  const { width, height } = useCanvasSize(wrapRef)
  const {
    register,
    unregister,
    perforationCount,
    activeShader,
    shaderParams,
    backgroundAsset,
  } = useStampEditor()

  useEffect(() => {
    const el = canvasElRef.current
    if (!el) return

    const fabricCanvas = new Canvas(el, {
      width,
      height,
      backgroundColor: undefined,
      preserveObjectStacking: true,
      centeredScaling: true,
      uniformScaling: false,
    })

    const stamp = createStampGroup()
    applyStampResizeHandles(stamp)
    clampStampBoundsAndCenter(fabricCanvas, stamp)

    const updateStampRect = () => {
      const bounds = stamp.getBoundingRect()
      setStampRect({
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      })
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
      setFrameTravelRect(readFrameTravelRect(stamp, active))
    }

    const onScaleOrModify = () => {
      clampStampBoundsAndCenter(fabricCanvas, stamp)
      syncChromeIfActive()
      updateStampRect()
      syncFrameTravelOverlay()
      fabricCanvas.requestRenderAll()
    }

    fabricCanvas.add(stamp)
    fabricCanvas.discardActiveObject()
    updateStampRect()
    fabricCanvas.requestRenderAll()

    const showChrome = () => {
      const currentActive = fabricCanvas.getActiveObject()
      // Don't steal focus from frame images that the user has selected.
      if (isFrameObject(currentActive)) return
      if (currentActive !== stamp) {
        fabricCanvas.setActiveObject(stamp)
      }
      const next = readChromeFromStamp(stamp)
      setChromeRect((prev) => (chromeEqual(prev, next) ? prev : next))
      fabricCanvas.requestRenderAll()
    }

    const hideChrome = () => {
      // Only deselect the stamp itself — leave frame elements alone so the
      // user keeps their selection when the cursor wanders outside the stamp.
      if (fabricCanvas.getActiveObject() === stamp) {
        fabricCanvas.discardActiveObject()
      }
      setChromeRect(null)
      fabricCanvas.requestRenderAll()
    }

    const onMouseMove = (opt: {
      scenePoint: { x: number; y: number }
      target?: FabricObject
    }) => {
      if (pointerOnStamp(stamp, opt)) {
        showChrome()
      } else {
        hideChrome()
      }
    }

    const onStagePointerLeave = () => {
      hideChrome()
    }

    const onSelectionChange = () => {
      syncFrameTravelOverlay()
    }

    const onObjectTransform = () => {
      syncFrameTravelOverlay()
    }

    stamp.on('modified', onScaleOrModify)
    stamp.on('scaling', onScaleOrModify)

    fabricCanvas.on('mouse:move', onMouseMove)
    fabricCanvas.on('selection:created', onSelectionChange)
    fabricCanvas.on('selection:updated', onSelectionChange)
    fabricCanvas.on('selection:cleared', onSelectionChange)
    fabricCanvas.on('object:moving', onObjectTransform)
    fabricCanvas.on('object:scaling', onObjectTransform)
    fabricCanvas.on('object:modified', onObjectTransform)

    const stage = stageRef.current
    stage?.addEventListener('pointerleave', onStagePointerLeave)

    fabricRef.current = fabricCanvas
    stampRef.current = stamp
    register({ canvas: fabricCanvas, stamp })

    return () => {
      stamp.off('modified', onScaleOrModify)
      stamp.off('scaling', onScaleOrModify)
      fabricCanvas.off('mouse:move', onMouseMove)
      fabricCanvas.off('selection:created', onSelectionChange)
      fabricCanvas.off('selection:updated', onSelectionChange)
      fabricCanvas.off('selection:cleared', onSelectionChange)
      fabricCanvas.off('object:moving', onObjectTransform)
      fabricCanvas.off('object:scaling', onObjectTransform)
      fabricCanvas.off('object:modified', onObjectTransform)
      stage?.removeEventListener('pointerleave', onStagePointerLeave)
      unregister()
      fabricCanvas.dispose()
      fabricRef.current = null
      stampRef.current = null
      setChromeRect(null)
      setFrameTravelRect(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; width/height handled below
  }, [register, unregister])

  useEffect(() => {
    const c = fabricRef.current
    const s = stampRef.current
    if (!c || !s) return
    c.setDimensions({ width, height })
    clampStampBoundsAndCenter(c, s)
    const bounds = s.getBoundingRect()
    setStampRect({
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    })
    c.requestRenderAll()
    if (c.getActiveObject() === s) {
      const next = readChromeFromStamp(s)
      setChromeRect((prev) => (chromeEqual(prev, next) ? prev : next))
    }
    const active = c.getActiveObject()
    if (isFrameObject(active)) {
      setFrameTravelRect(readFrameTravelRect(s, active))
    } else {
      setFrameTravelRect(null)
    }
  }, [width, height])

  return (
    <div ref={wrapRef} className="relative h-full min-h-0 w-full min-w-0 flex-1">
      <div
        ref={stageRef}
        className="relative h-full min-h-0 w-full overflow-hidden bg-[#141416]"
      >
        <ShaderLayer
          rect={stampRect}
          imageSrc={backgroundAsset?.src ?? ''}
          activeShader={activeShader}
          shaderParams={shaderParams}
        />
        <div className="relative z-20">
          <canvas ref={canvasElRef} className="block h-full w-full" />
        </div>
        <StampPerforations rect={stampRect} count={perforationCount} />
        {frameTravelRect ? (
          <div
            className="pointer-events-none absolute z-20 border border-red-500/90"
            style={{
              left: frameTravelRect.left,
              top: frameTravelRect.top,
              width: Math.max(0, frameTravelRect.width),
              height: Math.max(0, frameTravelRect.height),
              boxShadow: '0 0 0 1px rgba(239,68,68,0.22) inset',
            }}
          />
        ) : null}
        <StampResizeChromeOverlay rect={chromeRect} />
      </div>
    </div>
  )
}
