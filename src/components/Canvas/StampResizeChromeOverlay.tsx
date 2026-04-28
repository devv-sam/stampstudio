import { AnimatePresence, motion } from 'framer-motion'
import type { CSSProperties } from 'react'

export type ChromeRect = {
  left: number
  top: number
  width: number
  height: number
  rx: number
}

const L = 14
const stroke = '2px solid rgba(255, 255, 255, 0.55)'

const cornerBase: CSSProperties = {
  position: 'absolute',
  width: L,
  height: L,
  pointerEvents: 'none',
}

function cornerRadius(rx: number) {
  if (rx <= 0) return 0
  return Math.min(6, rx * 0.35)
}

const chromeVariants = {
  hidden: {
    opacity: 0,
    scale: 0.99,
    transition: { duration: 0.08, ease: [0.4, 0, 1, 1] as const },
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
  },
}

export function StampResizeChromeOverlay({ rect }: { rect: ChromeRect | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <AnimatePresence>
        {rect ? (
          <motion.div
            key="stamp-chrome"
            variants={chromeVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute box-border"
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              borderRadius: rect.rx,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: 'rgba(255, 255, 255, 0.42)',
            }}
          >
            <span
              style={{
                ...cornerBase,
                left: 0,
                top: 0,
                borderLeft: stroke,
                borderTop: stroke,
                borderTopLeftRadius: cornerRadius(rect.rx),
              }}
            />
            <span
              style={{
                ...cornerBase,
                right: 0,
                top: 0,
                borderRight: stroke,
                borderTop: stroke,
                borderTopRightRadius: cornerRadius(rect.rx),
              }}
            />
            <span
              style={{
                ...cornerBase,
                left: 0,
                bottom: 0,
                borderLeft: stroke,
                borderBottom: stroke,
                borderBottomLeftRadius: cornerRadius(rect.rx),
              }}
            />
            <span
              style={{
                ...cornerBase,
                right: 0,
                bottom: 0,
                borderRight: stroke,
                borderBottom: stroke,
                borderBottomRightRadius: cornerRadius(rect.rx),
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
