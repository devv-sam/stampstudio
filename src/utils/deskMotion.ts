import { useDialKit, type TransitionConfig } from 'dialkit'
import {
  useTransform,
  useVelocity,
  type MotionValue,
  type ValueAnimationTransition,
} from 'framer-motion'
import { useMemo } from 'react'

export const DESK_BOUNCE = 0.15

// dialkit marks easing curves with a type framer-motion doesn't know
export function toTransition(config: TransitionConfig): ValueAnimationTransition {
  if (config.type === 'spring') return config as ValueAnimationTransition
  return { duration: config.duration, ease: config.ease }
}

export function useDeskMotion() {
  const dial = useDialKit(
    'Desk motion',
    {
      spring: { type: 'spring', visualDuration: 0.25, bounce: DESK_BOUNCE },
      tapScale: [0.92, 0.7, 1, 0.01],
      popScale: [0.9, 0.6, 1, 0.01],
      popBlur: [10, 0, 30, 1],
      blurTime: [0.24, 0.05, 0.8, 0.01],
    },
    { id: 'desk-motion-v2', persist: true },
  )

  return useMemo(() => {
    const { tapScale, popScale, popBlur, blurTime } = dial
    const spring = toTransition(dial.spring)
    const hidden = {
      opacity: 0,
      scale: popScale,
      filter: `blur(${popBlur}px)`,
    }
    return {
      springy: spring,
      press: {
        whileTap: { scale: tapScale, y: 1 },
        transition: spring,
      },
      blurPop: {
        initial: hidden,
        animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
        exit: hidden,
        // filter runs on a tween, a spring overshoot would produce an invalid negative blur
        transition: {
          ...spring,
          opacity: { duration: 0.18 },
          filter: { duration: blurTime, ease: 'easeOut' as const },
        },
      },
    }
  }, [dial])
}

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
