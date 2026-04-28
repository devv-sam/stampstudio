import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
  type ChangeEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

interface PerforationSliderProps {
  label: string
  defaultValue?: number
  minValue?: number
  maxValue?: number
  step?: number
  damping?: number
  stiffness?: number
  onChange?: (value: number) => void
}

/** % of inner-bar width the handle starts fading before hitting label/value text. */
const FADE_BUFFER_PCT = 5
/** Minimum scale/opacity when handle is right against text. */
const MIN_SCALE = 0.4
const MIN_OPACITY = 0.3
/** How many px the handle sits inside the fill's right edge. */
const HANDLE_INSET_PX = 5

export function PerforationSlider({
  label,
  defaultValue = 14,
  minValue = 0,
  maxValue = 28,
  step = 1,
  damping = 22,
  stiffness = 280,
  onChange,
}: PerforationSliderProps) {
  const range = maxValue - minValue
  const clampedDefault = Math.min(Math.max(defaultValue, minValue), maxValue)
  const initialPercent = ((clampedDefault - minValue) / range) * 100

  const [currentValue, setCurrentValue] = useState(clampedDefault)
  const x = useSpring(initialPercent, { damping, stiffness })

  const fillWidth = useTransform(x, (v) => `${v}%`)
  const handleLeft = useTransform(x, (v) => `${v}%`)

  const handleScale = useMotionValue(1)
  const handleOpacity = useMotionValue(1)

  /** Inner bar measurement target (the rounded fill region, not the outer padding shell). */
  const innerRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const valueRef = useRef<HTMLSpanElement>(null)
  const zonesRef = useRef({ labelEndPct: 25, valueStartPct: 75 })

  /** Recompute handle scale/opacity for a given handle position (in %). */
  const recompute = (xv: number) => {
    const { labelEndPct, valueStartPct } = zonesRef.current
    const distFromLabel = xv - labelEndPct
    const distFromValue = valueStartPct - xv
    const nearest = Math.min(distFromLabel, distFromValue)
    const t = Math.max(0, Math.min(1, nearest / FADE_BUFFER_PCT))
    handleScale.set(MIN_SCALE + (1 - MIN_SCALE) * t)
    handleOpacity.set(MIN_OPACITY + (1 - MIN_OPACITY) * t)
  }

  /** Measure label/value DOM positions relative to the inner bar. */
  useLayoutEffect(() => {
    const measure = () => {
      const c = innerRef.current
      const l = labelRef.current
      const v = valueRef.current
      if (!c || !l || !v) return
      const cw = c.offsetWidth
      if (cw === 0) return
      zonesRef.current = {
        labelEndPct: ((l.offsetLeft + l.offsetWidth) / cw) * 100,
        valueStartPct: (v.offsetLeft / cw) * 100,
      }
      recompute(x.get())
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (innerRef.current) ro.observe(innerRef.current)
    return () => ro.disconnect()
  })

  useEffect(() => {
    const onChangeX = (latest: number) => {
      const clamped = Math.max(0, Math.min(100, latest))
      const stepped = Math.round(((clamped / 100) * range) / step) * step
      setCurrentValue(stepped + minValue)
      recompute(latest)
    }
    onChangeX(x.get())
    return x.on('change', onChangeX)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, range, step, minValue])

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    x.set(parseFloat(e.target.value))
  }

  const onDragEnd = () => {
    const snappedX = ((currentValue - minValue) / range) * 100
    x.set(snappedX)
    onChange?.(currentValue)
  }

  return (
    <div className="relative h-10 w-full rounded-lg bg-zinc-900 p-[3px]">
      {/* Inner bar — rounded, hosts the rounded fill and content */}
      <div
        ref={innerRef}
        className="relative flex h-full w-full items-center overflow-hidden rounded-md"
      >
        {/* Filled portion behind the handle */}
        <motion.div
          className="absolute inset-y-0 left-0 z-0 rounded-md bg-zinc-800"
          style={{ width: fillWidth }}
        />

        {/* Label — pinned left */}
        <span
          ref={labelRef}
          className="pointer-events-none relative z-10 select-none pl-3 pr-2 text-sm text-zinc-300"
        >
          {label}
        </span>

        <div className="flex-1" />

        {/* Value — pinned right */}
        <span
          ref={valueRef}
          className="pointer-events-none relative z-10 select-none pl-2 pr-3 font-mono text-sm tabular-nums text-zinc-300"
        >
          {currentValue}
        </span>

        {/* Handle — sits a few pixels inside the fill's right edge */}
        <motion.div
          className="pointer-events-none absolute top-1/2 z-20 h-5 w-[2px] -translate-y-1/2 rounded-full bg-zinc-200"
          style={{
            left: handleLeft,
            x: -HANDLE_INSET_PX,
            scaleY: handleScale,
            opacity: handleOpacity,
          }}
        />
      </div>

      {/* Native input handles drag/keyboard */}
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={x.get()}
        onChange={onInputChange}
        onPointerUp={onDragEnd}
        onKeyUp={onDragEnd}
        aria-valuemin={minValue}
        aria-valuemax={maxValue}
        aria-valuenow={currentValue}
        aria-label={label}
        className="absolute inset-0 z-30 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  )
}
