interface StampPerforationsProps {
  /** Stamp inner size in CSS px — path is in this coordinate system (matches clipped div). */
  width: number
  height: number
  count: number
}

const STAMP_PERF_CLIP_ID = 'stamp-perf-clip'

function buildCirclePath(cx: number, cy: number, r: number) {
  return [
    `M ${cx - r} ${cy}`,
    `A ${r} ${r} 0 1 0 ${cx + r} ${cy}`,
    `A ${r} ${r} 0 1 0 ${cx - r} ${cy}`,
    'Z',
  ].join(' ')
}

/**
 * Perforation mask in **stamp-local** coordinates (0,0)–(width,height).
 * Must match the size of the DOM node that references `clip-path: url(#stamp-perf-clip)`.
 */
function getPerforationClipPathD(
  width: number,
  height: number,
  count: number,
) {
  const safeCount = Math.max(0, Math.floor(count))
  if (safeCount === 0) return ''

  const hSpacing = width / (safeCount + 1)
  const vSpacing = height / (safeCount + 1)
  const r = Math.min(hSpacing, vSpacing) * 0.38
  const parts: string[] = [
    `M 0 0 H ${width} V ${height} H 0 Z`,
  ]

  for (let i = 0; i < safeCount; i += 1) {
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

export function StampPerforations({
  width,
  height,
  count,
}: StampPerforationsProps) {
  if (count === 0 || width <= 0 || height <= 0) return null

  const d = getPerforationClipPathD(width, height, count)
  if (!d) return null

  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      className="pointer-events-none absolute"
    >
      <defs>
        <clipPath id={STAMP_PERF_CLIP_ID} clipPathUnits="userSpaceOnUse">
          <path d={d} fillRule="evenodd" />
        </clipPath>
      </defs>
    </svg>
  )
}
