import { STAMP_BASE_WIDTH, STAMP_BASE_HEIGHT } from './fabricHelpers'

/** Slider value that matches the classic default look. */
export const PERFORATION_REF_DENSITY = 14

/**
 * Center-to-center pitch (px) at {@link PERFORATION_REF_DENSITY} on the
 * default stamp width — ~14 holes along a 420px edge.
 */
const REF_PITCH = STAMP_BASE_WIDTH / (PERFORATION_REF_DENSITY + 1)

/** Hole radius as a fraction of the local pitch. */
const RADIUS_OF_PITCH = 0.38

export type PerforationLayout = {
  hCount: number
  vCount: number
  hSpacing: number
  vSpacing: number
  r: number
}

/**
 * Density-driven perforation layout.
 *
 * `userDensity` is a ratio/gauge (slider 0–28), not a hole count: it sets a
 * shared target pitch so every edge keeps the same hole size and spacing.
 * Horizontal and vertical edges then get independent counts from their length
 * — tall stamps get more holes on the long sides, short stamps fewer.
 */
export function computePerforationLayout(
  width: number,
  height: number,
  userDensity: number,
): PerforationLayout {
  if (userDensity <= 0 || width < 16 || height < 16) {
    return { hCount: 0, vCount: 0, hSpacing: 0, vSpacing: 0, r: 0 }
  }

  // Mild size soften so tiny stamps stay legible and huge stamps don't balloon.
  const stampScale = Math.sqrt(
    Math.max(
      0.01,
      (width / STAMP_BASE_WIDTH) * (height / STAMP_BASE_HEIGHT),
    ),
  )
  const sizeFactor = Math.max(0.55, Math.min(1.55, stampScale ** 0.35))

  // Higher density → tighter pitch → denser perforations.
  const pitch = REF_PITCH * (PERFORATION_REF_DENSITY / userDensity) * sizeFactor

  let hCount = countForEdge(width, pitch)
  let vCount = countForEdge(height, pitch)

  let hSpacing = width / (hCount + 1)
  let vSpacing = height / (vCount + 1)
  let r = Math.min(hSpacing, vSpacing) * RADIUS_OF_PITCH

  // If rounding made holes too tiny, drop the denser edge's count.
  while ((hCount > 2 || vCount > 2) && r < 2.25) {
    if (hSpacing <= vSpacing && hCount > 2) hCount -= 1
    else if (vCount > 2) vCount -= 1
    else if (hCount > 2) hCount -= 1
    else break
    hSpacing = width / (hCount + 1)
    vSpacing = height / (vCount + 1)
    r = Math.min(hSpacing, vSpacing) * RADIUS_OF_PITCH
  }

  return { hCount, vCount, hSpacing, vSpacing, r }
}

function countForEdge(length: number, pitch: number): number {
  // Even placement with one-pitch end margins: first hole at spacing from corner.
  const raw = Math.round(length / pitch) - 1
  const cMax = Math.max(2, Math.min(64, Math.floor(length / 5) - 1))
  return Math.max(2, Math.min(cMax, raw))
}

export function buildPerforationClipPathD(
  width: number,
  height: number,
  userDensity: number,
): string {
  const { hCount, vCount, hSpacing, vSpacing, r } = computePerforationLayout(
    width,
    height,
    userDensity,
  )
  if ((hCount === 0 && vCount === 0) || r <= 0) return ''

  const parts: string[] = [`M 0 0 H ${width} V ${height} H 0 Z`]

  for (let i = 0; i < hCount; i += 1) {
    const cx = hSpacing * (i + 1)
    parts.push(buildCirclePath(cx, 0, r), buildCirclePath(cx, height, r))
  }
  for (let i = 0; i < vCount; i += 1) {
    const cy = vSpacing * (i + 1)
    parts.push(buildCirclePath(0, cy, r), buildCirclePath(width, cy, r))
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
