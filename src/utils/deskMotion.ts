import type { TransitionConfig } from 'dialkit'
import {
  useTransform,
  useVelocity,
  type MotionValue,
  type ValueAnimationTransition,
} from 'framer-motion'

export const DESK_BOUNCE = 0.15

// dialkit marks easing curves with a type framer-motion doesn't know
export function toTransition(config: TransitionConfig): ValueAnimationTransition {
  if (config.type === 'spring') return config as ValueAnimationTransition
  return { duration: config.duration, ease: config.ease }
}

const springy = {
  type: 'spring',
  visualDuration: 0.25,
  bounce: DESK_BOUNCE,
} as const

const hidden = { opacity: 0, scale: 0.9, filter: 'blur(10px)' }

const DESK_MOTION = {
  springy,
  press: { whileTap: { scale: 0.92, y: 1 }, transition: springy },
  blurPop: {
    initial: hidden,
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
    exit: hidden,
    // filter runs on a tween, a spring overshoot would produce an invalid negative blur
    transition: {
      ...springy,
      opacity: { duration: 0.18 },
      filter: { duration: 0.24, ease: 'easeOut' as const },
    },
  },
}

export const useDeskMotion = () => DESK_MOTION

export function useVelocityBlur(
  a: MotionValue<number>,
  b: MotionValue<number>,
  maxPx = 4,
) {
  const va = useVelocity(a)
  const vb = useVelocity(b)
  return useTransform([va, vb], ([x, y]: number[]) => {
    const px = Math.min(maxPx, Math.hypot(x!, y!) / 300)
    return px < 0.2 ? 'none' : `blur(${px.toFixed(2)}px)`
  })
}
