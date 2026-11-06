import { motion, useSpring } from 'framer-motion'
import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'

const RAIL_GAP = 10
const BAND_INSIDE = 14
const BAND_OUTSIDE = 26
const GRIP_LENGTH = 56
const CORNER_GRIP = 34
const KEY_STEP = 2
const GRIP_SPRING = { visualDuration: 0.18, bounce: 0.15 }

type Axis = 'width' | 'height'

function Edge({
  axis,
  linked,
  width,
  height,
  scale,
  onResize,
  onEnd,
}: ResizeProps & { axis: Axis; linked: boolean }) {
  const horizontal = axis === 'height'
  const length = horizontal ? width : height
  const size = horizontal ? height : width

  const [hot, setHot] = useState(false)
  const drag = useRef<{ pointer: number; size: number } | null>(null)
  const grip = useSpring(length / 2, GRIP_SPRING)

  const resizeTo = (next: number) =>
    horizontal ? onResize(width, next) : onResize(next, height)

  const moveGrip = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const along = horizontal ? e.clientX - box.left : e.clientY - box.top
    const half = GRIP_LENGTH / 2
    grip.set(Math.min(length - half, Math.max(half, along / scale)))
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    moveGrip(e)
    const start = drag.current
    if (!start) return
    const pointer = horizontal ? e.clientY : e.clientX
    // the stamp stays centered, so doubling keeps the edge under the pointer
    resizeTo(Math.round(start.size + ((pointer - start.pointer) / scale) * 2))
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { pointer: horizontal ? e.clientY : e.clientX, size }
    setHot(true)
  }

  const onPointerUp = () => {
    if (!drag.current) return
    drag.current = null
    onEnd()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key]
    if (!by) return
    e.preventDefault()
    resizeTo(size + by * KEY_STEP)
    onEnd()
  }

  const band = horizontal
    ? { left: 0, right: 0, top: `calc(100% - ${BAND_INSIDE}px)`, height: BAND_INSIDE + BAND_OUTSIDE }
    : { top: 0, bottom: 0, left: `calc(100% - ${BAND_INSIDE}px)`, width: BAND_INSIDE + BAND_OUTSIDE }

  const railOffset = BAND_INSIDE + RAIL_GAP

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={`Stamp ${axis}`}
      aria-orientation={horizontal ? 'vertical' : 'horizontal'}
      aria-valuenow={size}
      className="absolute z-[22] cursor-none touch-none focus-visible:outline-none"
      style={band}
      onPointerEnter={(e) => {
        moveGrip(e)
        setHot(true)
      }}
      onPointerLeave={() => {
        if (!drag.current) setHot(false)
      }}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
      onKeyDown={onKeyDown}
    >
      <span
        className={`absolute border-dotted transition-colors duration-150 ${
          hot || linked ? 'border-ink/60' : 'border-ink/20'
        }`}
        style={
          horizontal
            ? { left: 0, right: 0, top: railOffset, borderTopWidth: 2 }
            : { top: 0, bottom: 0, left: railOffset, borderLeftWidth: 2 }
        }
      />
      <motion.span
        className="absolute rounded-full bg-ink"
        initial={false}
        animate={{ opacity: hot ? 1 : 0 }}
        transition={{ duration: 0.12 }}
        style={
          horizontal
            ? {
                top: railOffset - 1,
                width: GRIP_LENGTH,
                height: 4,
                x: grip,
                marginLeft: -GRIP_LENGTH / 2,
              }
            : {
                left: railOffset - 1,
                height: GRIP_LENGTH,
                width: 4,
                y: grip,
                marginTop: -GRIP_LENGTH / 2,
              }
        }
      />
    </div>
  )
}

type ResizeProps = {
  width: number
  height: number
  scale: number
  minSide: number
  maxWidth: number
  maxHeight: number
  onResize: (width: number, height: number) => void
  onEnd: () => void
}

function Corner({
  width,
  height,
  scale,
  minSide,
  maxWidth,
  maxHeight,
  onResize,
  onEnd,
  hot,
  onHotChange,
}: ResizeProps & { hot: boolean; onHotChange: (hot: boolean) => void }) {
  const drag = useRef<{ x: number; y: number; w: number; h: number } | null>(
    null,
  )
  const zone = BAND_INSIDE + BAND_OUTSIDE
  const reach = RAIL_GAP + 1

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = drag.current
    if (!start) return
    const w = start.w + ((e.clientX - start.x) / scale) * 2
    const h = start.h + ((e.clientY - start.y) / scale) * 2
    // project the pointer onto the stamp's diagonal so the ratio stays locked
    const factor =
      (w * start.w + h * start.h) / (start.w ** 2 + start.h ** 2)
    const clamped = Math.min(
      maxWidth / start.w,
      maxHeight / start.h,
      Math.max(minSide / Math.min(start.w, start.h), factor),
    )
    onResize(Math.round(start.w * clamped), Math.round(start.h * clamped))
  }

  const onPointerUp = () => {
    if (!drag.current) return
    drag.current = null
    onEnd()
  }

  return (
    <div
      aria-hidden
      className="absolute z-[23] cursor-none touch-none"
      style={{
        left: `calc(100% - ${BAND_INSIDE}px)`,
        top: `calc(100% - ${BAND_INSIDE}px)`,
        width: zone,
        height: zone,
      }}
      onPointerEnter={() => onHotChange(true)}
      onPointerLeave={() => {
        if (!drag.current) onHotChange(false)
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { x: e.clientX, y: e.clientY, w: width, h: height }
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <span
        className={`absolute rounded-br-[12px] border-r-2 border-b-2 border-dotted transition-colors duration-150 ${
          hot ? 'border-ink/60' : 'border-ink/20'
        }`}
        style={{
          left: BAND_INSIDE,
          top: BAND_INSIDE,
          width: reach + 1,
          height: reach + 1,
        }}
      />
      <motion.span
        className="absolute rounded-br-[14px] border-r-4 border-b-4 border-ink"
        initial={false}
        animate={{ opacity: hot ? 1 : 0 }}
        transition={{ duration: 0.12 }}
        style={{
          left: BAND_INSIDE + reach + 2 - CORNER_GRIP,
          top: BAND_INSIDE + reach + 2 - CORNER_GRIP,
          width: CORNER_GRIP,
          height: CORNER_GRIP,
        }}
      />
    </div>
  )
}

export function StampResizeEdges(props: ResizeProps) {
  const [cornerHot, setCornerHot] = useState(false)

  return (
    <>
      <Edge axis="width" linked={cornerHot} {...props} />
      <Edge axis="height" linked={cornerHot} {...props} />
      <Corner hot={cornerHot} onHotChange={setCornerHot} {...props} />
    </>
  )
}
