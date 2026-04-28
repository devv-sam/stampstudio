/** Background color of the Fabric canvas — must stay in sync with Canvas backgroundColor. */
const CANVAS_BG = '#141416'

interface StampPerforationsProps {
  rect: {
    left: number
    top: number
    width: number
    height: number
  } | null
  /** Number of holes per edge. Only changes on slider settle, never mid-drag. */
  count: number
  /** Stamp fill color — must match the Fabric rect fill for correct export. */
  color: string
}

/**
 * SVG overlay that renders postage-stamp perforations via the painter's algorithm:
 *   1. Fill the stamp area with `color`.
 *   2. Draw circles in CANVAS_BG at each edge position — these visually "punch" holes.
 *
 * No masking is needed. The circle count is fixed by `count`, so geometry only
 * recomputes when the slider settles. During live resize, React just re-positions
 * the same circle count at new coordinates — cheap diffing, no per-frame calculation.
 *
 * Geometry:
 *   hSpacing = width  / (count + 1)  →  evenly distributed along top/bottom
 *   vSpacing = height / (count + 1)  →  evenly distributed along left/right
 *   r        = min(hSpacing, vSpacing) * 0.38  →  proportional, scales with stamp
 */
export function StampPerforations({ rect, count, color }: StampPerforationsProps) {
  if (!rect || count === 0) return null

  const { left, top, width, height } = rect
  const hSpacing = width / (count + 1)
  const vSpacing = height / (count + 1)
  const r = Math.min(hSpacing, vSpacing) * 0.38

  return (
    <div
      className="pointer-events-none absolute"
      style={{ left, top, width, height }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 overflow-visible"
      >
        {/* 1 — stamp body */}
        <rect width={width} height={height} fill={color} />

        {/* 2 — perforation holes (canvas bg color painted over edges) */}
        {Array.from({ length: count }, (_, i) => (
          <circle key={`t${i}`} cx={hSpacing * (i + 1)} cy={0} r={r} fill={CANVAS_BG} />
        ))}
        {Array.from({ length: count }, (_, i) => (
          <circle key={`b${i}`} cx={hSpacing * (i + 1)} cy={height} r={r} fill={CANVAS_BG} />
        ))}
        {Array.from({ length: count }, (_, i) => (
          <circle key={`l${i}`} cx={0} cy={vSpacing * (i + 1)} r={r} fill={CANVAS_BG} />
        ))}
        {Array.from({ length: count }, (_, i) => (
          <circle key={`r${i}`} cx={width} cy={vSpacing * (i + 1)} r={r} fill={CANVAS_BG} />
        ))}
      </svg>
    </div>
  )
}
