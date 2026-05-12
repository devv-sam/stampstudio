import { STAMP_BASE_HEIGHT, STAMP_BASE_WIDTH } from './fabricHelpers'

/**
 * Perforation notch radius scales ~ stampScale^0.8 (sub-linear), clamped so
 * large stamps stay clean and small stamps stay legible.
 */
export function computePerforationLayout(
  width: number,
  height: number,
  userDensity: number,
): { count: number; hSpacing: number; vSpacing: number; r: number } {
  if (userDensity <= 0 || width < 16 || height < 16) {
    return { count: 0, hSpacing: 0, vSpacing: 0, r: 0 }
  }

  const stampScale = Math.sqrt(
    Math.max(
      0.01,
      (width / STAMP_BASE_WIDTH) * (height / STAMP_BASE_HEIGHT),
    ),
  )

  /** Matches ~14-perf look at default stamp size when density = 14. */
  const rDesired = Math.min(
    8,
    Math.max(4, 7.5 * stampScale ** 0.8),
  )

  const m = Math.min(width, height)
  const cIdeal = Math.max(2, Math.round((m * 0.38) / rDesired - 1))

  const bias = userDensity / 14
  const cMax = Math.max(2, Math.min(48, Math.floor(m / 5) - 1))
  let count = Math.max(2, Math.min(cMax, Math.round(cIdeal * bias)))

  let hSpacing = width / (count + 1)
  let vSpacing = height / (count + 1)
  let r = Math.min(hSpacing, vSpacing) * 0.38

  while (count > 2 && r < 2.25) {
    count -= 1
    hSpacing = width / (count + 1)
    vSpacing = height / (count + 1)
    r = Math.min(hSpacing, vSpacing) * 0.38
  }

  return { count, hSpacing, vSpacing, r }
}

export function buildPerforationClipPathD(
  width: number,
  height: number,
  userDensity: number,
): string {
  const { count, hSpacing, vSpacing, r } = computePerforationLayout(
    width,
    height,
    userDensity,
  )
  if (count === 0 || r <= 0) return ''

  const parts: string[] = [`M 0 0 H ${width} V ${height} H 0 Z`]

  for (let i = 0; i < count; i += 1) {
    const cxTopBottom = hSpacing * (i + 1)
    const cyLeftRight = vSpacing * (i + 1)
    parts.push(
      buildCirclePath(cxTopBottom, 0, r),
      buildCirclePath(cxTopBottom, height, r),
      buildCirclePath(0, cyLeftRight, r),
      buildCirclePath(width, cyLeftRight, r),
    )
  }

  return parts.join(' ')
}

function buildCirclePath(cx: number, cy: number, rad: number) {
  return [
    `M ${cx - rad} ${cy}`,
    `A ${rad} ${rad} 0 1 0 ${cx + rad} ${cy}`,
    `A ${rad} ${rad} 0 1 0 ${cx - rad} ${cy}`,
    'Z',
  ].join(' ')
}
