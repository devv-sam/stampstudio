import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import { useDeskMotion } from '../../utils/deskMotion'
import { RollingNumber } from '../UI/RollingNumber'

const MIN = 0
const MAX = 28
const PX_PER_STEP = 7

type Side = 'top' | 'right' | 'bottom' | 'left'

const BAND: Record<Side, string> = {
  top: 'inset-x-12 -top-4 h-7 cursor-ns-resize',
  bottom: 'inset-x-12 -bottom-4 h-7 cursor-ns-resize',
  left: 'inset-y-12 -left-4 w-7 cursor-ew-resize',
  right: 'inset-y-12 -right-4 w-7 cursor-ew-resize',
}

const NUB: Record<Side, string> = {
  top: 'h-1.5 w-10',
  bottom: 'h-1.5 w-10',
  left: 'h-10 w-1.5',
  right: 'h-10 w-1.5',
}

// dragging away from the stamp adds teeth
const outward = (side: Side, dx: number, dy: number) =>
  ({ top: -dy, bottom: dy, left: -dx, right: dx })[side]

export function PerforationEdge({
  value,
  onChange,
}: {
  value: number
  onChange: (next: number) => void
}) {
  const { blurPop } = useDeskMotion()
  const start = useRef<{ x: number; y: number; value: number } | null>(null)
  const [active, setActive] = useState(false)

  const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n))

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, y: e.clientY, value }
    setActive(true)
  }

  const onPointerMove = (side: Side, e: PointerEvent<HTMLDivElement>) => {
    const s = start.current
    if (!s) return
    const moved = outward(side, e.clientX - s.x, e.clientY - s.y)
    onChange(clamp(s.value + Math.round(moved / PX_PER_STEP)))
  }

  const onPointerUp = () => {
    start.current = null
    setActive(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key]
    if (!by) return
    e.preventDefault()
    onChange(clamp(value + by))
  }

  return (
    <>
      {(['bottom', 'top', 'left', 'right'] as const).map((side) => (
        <div
          key={side}
          {...(side === 'bottom'
            ? {
                role: 'slider',
                tabIndex: 0,
                'aria-label': 'Perforation',
                'aria-valuemin': MIN,
                'aria-valuemax': MAX,
                'aria-valuenow': value,
                onKeyDown,
              }
            : { 'aria-hidden': true })}
          title="Drag to change perforation"
          onPointerDown={onPointerDown}
          onPointerMove={(e) => onPointerMove(side, e)}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`group absolute z-[22] flex touch-none items-center justify-center focus-visible:outline-3 focus-visible:outline-cornflower ${BAND[side]}`}
        >
          <span
            className={`rounded-full bg-peony/60 transition-transform group-hover:scale-125 group-hover:bg-peony ${NUB[side]}`}
          />
        </div>
      ))}
      <div className="pointer-events-none absolute -top-11 left-0 right-0 z-[23] flex justify-center">
        <AnimatePresence>
          {active ? (
            <motion.p
              {...blurPop}
              className="rounded-xl bg-peony px-3 py-1 text-sm whitespace-nowrap text-ink"
            >
              Perforation <RollingNumber value={value} />
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  )
}
