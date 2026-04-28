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
}

/**
 * SVG overlay that punches postage-stamp perforations along the stamp's edges.
 *
 * Painter's algorithm: paint canvas-bg-coloured circles centred on each edge so
 * that half of each circle overlaps the Fabric stamp underneath, creating the
 * illusion of a punched hole. The stamp body itself is rendered by the Fabric
 * `Rect` (solid colour or image-pattern fill) — this overlay never paints body
 * pixels, so any Fabric content (background image, frame elements) shows
 * through correctly.
 *
 * Geometry:
 *   hSpacing = width  / (count + 1)  →  evenly distributed along top/bottom
 *   vSpacing = height / (count + 1)  →  evenly distributed along left/right
 *   r        = min(hSpacing, vSpacing) * 0.38  →  proportional, scales with stamp
 */
export function StampPerforations({ rect, count }: StampPerforationsProps) {
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
