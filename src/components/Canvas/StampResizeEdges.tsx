import { motion, useSpring, useTransform } from 'framer-motion'
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'

const RAIL_GAP = 10
const CORNER_RADIUS = 14
const GRIP_LENGTH = 56
const GRIP_PRESSED_LENGTH = 38
const HIT_WIDTH = 36
const CORNER_REACH = 30
const KEY_STEP = 2
const GRIP_SPRING = { visualDuration: 0.18, bounce: 0.15 }

type Mode = 'width' | 'height' | 'corner'

// phones have no rail, each side of the stamp drags instead
const SIDES = [
  { mode: 'width', sign: 1, className: 'inset-y-6 -right-4 w-8 cursor-ew-resize' },
  { mode: 'width', sign: -1, className: 'inset-y-6 -left-4 w-8 cursor-ew-resize' },
  { mode: 'height', sign: 1, className: 'inset-x-6 -bottom-4 h-8 cursor-ns-resize' },
  { mode: 'height', sign: -1, className: 'inset-x-6 -top-4 h-8 cursor-ns-resize' },
] as const

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

function railGeometry(width: number, height: number) {
  const r = CORNER_RADIUS
  const x = width + RAIL_GAP
  const y = height + RAIL_GAP
  const rightLength = y - r
  const arcLength = (Math.PI * r) / 2
  return {
    x,
    y,
    rightLength,
    arcLength,
    cornerAt: rightLength + arcLength / 2,
    total: rightLength + arcLength + x - r,
    d: `M ${x} 0 V ${y - r} A ${r} ${r} 0 0 1 ${x - r} ${y} H 0`,
  }
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

// distance along the rail of the point nearest the pointer
function projectOntoRail(
  px: number,
  py: number,
  rail: ReturnType<typeof railGeometry>,
) {
  const r = CORNER_RADIUS
  const { x, y, rightLength, arcLength } = rail

  const rightY = clamp(py, 0, y - r)
  const bottomX = clamp(px, 0, x - r)
  const angle = clamp(Math.atan2(py - (y - r), px - (x - r)), 0, Math.PI / 2)

  const candidates = [
    { along: rightY, cx: x, cy: rightY },
    {
      along: rightLength + angle * r,
      cx: x - r + r * Math.cos(angle),
      cy: y - r + r * Math.sin(angle),
    },
    { along: rightLength + arcLength + (x - r - bottomX), cx: bottomX, cy: y },
  ]

  return candidates.reduce((best, c) =>
    Math.hypot(px - c.cx, py - c.cy) < Math.hypot(px - best.cx, py - best.cy)
      ? c
      : best,
  ).along
}

function modeAt(along: number, rail: ReturnType<typeof railGeometry>): Mode {
  if (Math.abs(along - rail.cornerAt) < CORNER_REACH) return 'corner'
  return along < rail.cornerAt ? 'width' : 'height'
}

export function StampResizeEdges({
  width,
  height,
  scale,
  minSide,
  maxWidth,
  maxHeight,
  onResize,
  onEnd,
}: ResizeProps) {
  const rail = railGeometry(width, height)

  const [hot, setHot] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{
    mode: Mode
    sign: 1 | -1
    x: number
    y: number
    w: number
    h: number
  } | null>(null)

  const grip = useSpring(rail.rightLength / 2, GRIP_SPRING)
  const gripLength = useSpring(GRIP_LENGTH, GRIP_SPRING)
  const gripDash = useTransform(gripLength, (length) => `${length} 100000`)
  // offset by half the live length so the grip shrinks toward its center
  const gripOffset = useTransform(
    [grip, gripLength],
    ([along, length]: number[]) => length! / 2 - along!,
  )

  // the rail changes length as the stamp resizes, so the grip re-anchors to the corner or the far end
  const anchor = useRef<'corner' | number | null>(null)

  useEffect(() => {
    if (anchor.current === 'corner') grip.jump(rail.cornerAt)
    else if (anchor.current !== null) grip.jump(rail.total - anchor.current)
  }, [grip, rail.cornerAt, rail.total])

  const placeGrip = (along: number) => {
    const mode = modeAt(along, rail)
    // the corner pulls the grip in, so it reads as one handle bending round
    const settled = mode === 'corner' ? rail.cornerAt : along
    const next = clamp(settled, GRIP_LENGTH / 2, rail.total - GRIP_LENGTH / 2)
    anchor.current =
      mode === 'corner' ? 'corner' : mode === 'height' ? rail.total - next : null
    grip.set(next)
  }

  const alongFromPointer = (e: PointerEvent<Element>) => {
    const box = svgRef.current!.getBoundingClientRect()
    return projectOntoRail(
      (e.clientX - box.left) / scale,
      (e.clientY - box.top) / scale,
      rail,
    )
  }

  const onPointerMove = (e: PointerEvent<Element>) => {
    const start = drag.current
    if (!start) {
      placeGrip(alongFromPointer(e))
      return
    }

    const w = start.w + ((e.clientX - start.x) / scale) * 2 * start.sign
    const h = start.h + ((e.clientY - start.y) / scale) * 2 * start.sign

    if (start.mode === 'width') {
      onResize(Math.round(w), start.h)
      placeGrip(alongFromPointer(e))
    } else if (start.mode === 'height') {
      onResize(start.w, Math.round(h))
      placeGrip(alongFromPointer(e))
    } else {
      // project the pointer onto the stamp's diagonal so the ratio stays locked
      const factor =
        (w * start.w + h * start.h) / (start.w ** 2 + start.h ** 2)
      const locked = Math.min(
        maxWidth / start.w,
        maxHeight / start.h,
        Math.max(minSide / Math.min(start.w, start.h), factor),
      )
      onResize(Math.round(start.w * locked), Math.round(start.h * locked))
    }
  }

  const startDrag = (e: PointerEvent<Element>, mode: Mode, sign: 1 | -1) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = {
      mode,
      sign,
      x: e.clientX,
      y: e.clientY,
      w: width,
      h: height,
    }
    gripLength.set(GRIP_PRESSED_LENGTH)
    setHot(true)
  }

  const onPointerUp = () => {
    if (!drag.current) return
    drag.current = null
    gripLength.set(GRIP_LENGTH)
    onEnd()
  }

  const onKey = (axis: 'width' | 'height') => (
    e: KeyboardEvent<HTMLDivElement>,
  ) => {
    const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key]
    if (!by) return
    e.preventDefault()
    const step = by * KEY_STEP
    onResize(
      axis === 'width' ? width + step : width,
      axis === 'height' ? height + step : height,
    )
    onEnd()
  }

  const onKeyFocus = (axis: 'width' | 'height') => () => {
    setHot(true)
    grip.set(
      axis === 'width' ? rail.rightLength / 2 : rail.total - rail.x / 2,
    )
  }

  return (
    <>
      <svg
        ref={svgRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[22] h-full w-full overflow-visible max-md:hidden"
      >
        <path
          d={rail.d}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="0.1 6"
          className={`transition-[stroke] duration-150 ${
            hot ? 'stroke-ink/60' : 'stroke-ink/20'
          }`}
        />
        <motion.path
          d={rail.d}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-ink"
          initial={false}
          animate={{ opacity: hot ? 1 : 0 }}
          transition={{ duration: 0.12 }}
          style={{ strokeDasharray: gripDash, strokeDashoffset: gripOffset }}
        />
        <path
          d={rail.d}
          fill="none"
          stroke="transparent"
          strokeWidth={HIT_WIDTH}
          className="cursor-none touch-none"
          style={{ pointerEvents: 'stroke' }}
          onPointerEnter={(e) => {
            grip.jump(
              clamp(
                alongFromPointer(e),
                GRIP_LENGTH / 2,
                rail.total - GRIP_LENGTH / 2,
              ),
            )
            setHot(true)
          }}
          onPointerLeave={() => {
            if (!drag.current) setHot(false)
          }}
          onPointerMove={onPointerMove}
          onPointerDown={(e) => startDrag(e, modeAt(alongFromPointer(e), rail), 1)}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </svg>

      {SIDES.map(({ mode, sign, className }) => (
        <div
          key={`${mode}${sign}`}
          aria-hidden
          className={`absolute z-[22] touch-none md:hidden ${className}`}
          onPointerDown={(e) => startDrag(e, mode, sign)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      ))}

      {(['width', 'height'] as const).map((axis) => (
        <div
          key={axis}
          role="slider"
          tabIndex={0}
          aria-label={`Stamp ${axis}`}
          aria-orientation={axis === 'width' ? 'horizontal' : 'vertical'}
          aria-valuenow={axis === 'width' ? width : height}
          className="sr-only"
          onKeyDown={onKey(axis)}
          onFocus={onKeyFocus(axis)}
          onBlur={() => setHot(false)}
        />
      ))}
    </>
  )
}
