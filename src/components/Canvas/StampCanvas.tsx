import { Canvas } from 'fabric'
import { useEffect, useRef } from 'react'

import { useCanvasSize } from '../../hooks/useCanvas'
import { useStampEditor } from '../../hooks/useStampEditor'
import {
  applyStampResizeHandles,
  createInitialStampRect,
} from '../../utils/fabricHelpers'
import { CanvasControls } from './CanvasControls'

export function StampCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const stampRef = useRef<ReturnType<typeof createInitialStampRect> | null>(
    null,
  )

  const { width, height } = useCanvasSize(wrapRef)
  const { register, unregister } = useStampEditor()

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
    fabricCanvas.setActiveObject(stamp)
    fabricCanvas.requestRenderAll()

    fabricRef.current = fabricCanvas
    stampRef.current = stamp
    register({ canvas: fabricCanvas, stamp })

    return () => {
      unregister()
      fabricCanvas.dispose()
      fabricRef.current = null
      stampRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; width/height handled below
  }, [register, unregister])

  useEffect(() => {
    const c = fabricRef.current
    if (!c) return
    c.setDimensions({ width, height })
    c.requestRenderAll()
  }, [width, height])

  const handleFit = () => {
    const c = fabricRef.current
    const stamp = stampRef.current
    if (!c || !stamp) return

    const margin = 48
    const sw = stamp.width ?? 1
    const sh = stamp.height ?? 1
    const scale = Math.min(
      (c.getWidth() - margin * 2) / sw,
      (c.getHeight() - margin * 2) / sh,
      1,
    )

    stamp.set({
      scaleX: scale,
      scaleY: scale,
      left: (c.getWidth() - sw * scale) / 2,
      top: (c.getHeight() - sh * scale) / 2,
    })
    stamp.setCoords()
    c.setActiveObject(stamp)
    c.requestRenderAll()
    stamp.fire('modified', { target: stamp })
  }

  const handleDeselect = () => {
    fabricRef.current?.discardActiveObject()
    fabricRef.current?.requestRenderAll()
  }

  return (
    <div
      ref={wrapRef}
      className="relative flex h-full min-h-[420px] w-full flex-col"
    >
      <div className="pointer-events-none absolute right-4 top-4 z-10">
        <CanvasControls onFit={handleFit} onDeselect={handleDeselect} />
      </div>
      <div className="flex min-h-0 flex-1 items-stretch justify-stretch p-4">
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/30 shadow-inner">
          <canvas ref={canvasElRef} className="block h-full w-full" />
        </div>
      </div>
    </div>
  )
}
