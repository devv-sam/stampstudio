interface StampPerforationsProps {
  stageWidth: number
  stageHeight: number
  rect: {
    left: number
    top: number
    width: number
    height: number
  } | null
  /** Number of holes per edge. Only changes on slider settle, never mid-drag. */
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

function getPerforationPath(
  stageWidth: number,
  stageHeight: number,
  rect: { left: number; top: number; width: number; height: number },
  count: number,
) {
  const safeCount = Math.max(0, Math.floor(count))
  if (safeCount === 0) return ''

  const { left, top, width, height } = rect
  const hSpacing = width / (safeCount + 1)
  const vSpacing = height / (safeCount + 1)
  const r = Math.min(hSpacing, vSpacing) * 0.38
  const parts: string[] = [
    `M 0 0 H ${stageWidth} V ${stageHeight} H 0 Z`,
  ]

  for (let i = 0; i < safeCount; i += 1) {
    const cxTopBottom = left + hSpacing * (i + 1)
    const cyLeftRight = top + vSpacing * (i + 1)
    parts.push(
      buildCirclePath(cxTopBottom, top, r),
      buildCirclePath(cxTopBottom, top + height, r),
      buildCirclePath(left, cyLeftRight, r),
      buildCirclePath(left + width, cyLeftRight, r),
    )
  }

  return parts.join(' ')
}

export function StampPerforations({
  stageWidth,
  stageHeight,
  rect,
  count,
}: StampPerforationsProps) {
  if (!rect || count === 0) return null

  const d = getPerforationPath(stageWidth, stageHeight, rect, count)
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
