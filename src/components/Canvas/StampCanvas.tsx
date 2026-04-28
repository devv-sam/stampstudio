import { Canvas } from 'fabric'
import type { Rect } from 'fabric'
import { useEffect, useRef, useState } from 'react'

import { useCanvasSize } from '../../hooks/useCanvas'
import { useStampEditor } from '../../hooks/useStampEditor'
import {
  applyStampResizeHandles,
  createInitialStampRect,
} from '../../utils/fabricHelpers'
import {
  StampResizeChromeOverlay,
  type ChromeRect,
} from './StampResizeChromeOverlay'

const HOVER_PAD = 56
/** Short debounce when leaving the expanded bbox (not the stage) to avoid flicker near handles */
const LEAVE_MS = 12

function expandedContains(
  b: { left: number; top: number; width: number; height: number },
  x: number,
  y: number,
  pad: number,
) {
  return (
    x >= b.left - pad &&
    x <= b.left + b.width + pad &&
    y >= b.top - pad &&
    y <= b.top + b.height + pad
  )
}

function readChromeFromStamp(stamp: Rect): ChromeRect {
  const box = stamp.getBoundingRect()
  const sx = stamp.scaleX || 1
  const baseRx = (stamp.rx || 0) * sx
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

export function StampCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const stampRef = useRef<ReturnType<typeof createInitialStampRect> | null>(
    null,
  )
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [chromeRect, setChromeRect] = useState<ChromeRect | null>(null)

  const { width, height } = useCanvasSize(wrapRef)
  const { register, unregister } = useStampEditor()

  const clearLeaveTimer = () => {
    if (leaveTimerRef.current != null) {
      clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
  }

  // Fabric canvas is created once; dimensions are updated in a separate effect.
  useEffect(() => {
    const el = canvasElRef.current
    if (!el) return

    const fabricCanvas = new Canvas(el, {
      width,
      height,
      backgroundColor: '#141416',
      preserveObjectStacking: true,
    })

    const stamp = createInitialStampRect()
    applyStampResizeHandles(stamp)

    fabricCanvas.add(stamp)
    fabricCanvas.discardActiveObject()
    fabricCanvas.requestRenderAll()

    const syncChromeIfActive = () => {
      if (fabricCanvas.getActiveObject() !== stamp) return
      const next = readChromeFromStamp(stamp)
      setChromeRect((prev) => (chromeEqual(prev, next) ? prev : next))
    }

    const showChrome = () => {
      clearLeaveTimer()
      if (fabricCanvas.getActiveObject() !== stamp) {
        fabricCanvas.setActiveObject(stamp)
      }
      const next = readChromeFromStamp(stamp)
      setChromeRect((prev) => (chromeEqual(prev, next) ? prev : next))
      fabricCanvas.requestRenderAll()
    }

    const hideChrome = () => {
      fabricCanvas.discardActiveObject()
      setChromeRect(null)
      fabricCanvas.requestRenderAll()
    }

    const scheduleHide = () => {
      clearLeaveTimer()
      leaveTimerRef.current = setTimeout(() => {
        leaveTimerRef.current = null
        hideChrome()
      }, LEAVE_MS)
    }

    const onMouseMove = (opt: { scenePoint: { x: number; y: number } }) => {
      const { x, y } = opt.scenePoint
      const b = stamp.getBoundingRect()
      if (expandedContains(b, x, y, HOVER_PAD)) {
        showChrome()
      } else {
        scheduleHide()
      }
    }

    const onStagePointerLeave = () => {
      clearLeaveTimer()
      hideChrome()
    }

    stamp.on('modified', syncChromeIfActive)
    stamp.on('scaling', syncChromeIfActive)
    stamp.on('moving', syncChromeIfActive)

    fabricCanvas.on('mouse:move', onMouseMove)

    const stage = stageRef.current
    stage?.addEventListener('pointerleave', onStagePointerLeave)

    fabricRef.current = fabricCanvas
    stampRef.current = stamp
    register({ canvas: fabricCanvas, stamp })

    return () => {
      clearLeaveTimer()
      stamp.off('modified', syncChromeIfActive)
      stamp.off('scaling', syncChromeIfActive)
      stamp.off('moving', syncChromeIfActive)
      fabricCanvas.off('mouse:move', onMouseMove)
      stage?.removeEventListener('pointerleave', onStagePointerLeave)
      unregister()
      fabricCanvas.dispose()
      fabricRef.current = null
      stampRef.current = null
      setChromeRect(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; width/height handled below
  }, [register, unregister])

  useEffect(() => {
    const c = fabricRef.current
    if (!c) return
    c.setDimensions({ width, height })
    c.requestRenderAll()
  }, [width, height])

  return (
    <div
      ref={wrapRef}
      className="relative flex h-full min-h-[420px] w-full flex-col"
    >
      <div className="flex min-h-0 flex-1 items-stretch justify-stretch p-4">
        <div
          ref={stageRef}
          className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/30 shadow-inner"
        >
          <canvas ref={canvasElRef} className="block h-full w-full" />
          <StampResizeChromeOverlay rect={chromeRect} />
        </div>
      </div>
    </div>
  )
}
