import { buildPerforationClipPathD } from '../../utils/stampPerforationLayout'

interface StampPerforationsProps {
  /** Stamp inner size in CSS px — path is in this coordinate system (matches clipped div). */
  width: number
  height: number
  /** Slider density/ratio (0 = off); sets shared pitch, not a fixed hole count. */
  userDensity: number
}

const STAMP_PERF_CLIP_ID = 'stamp-perf-clip'

export function StampPerforations({
  width,
  height,
  userDensity,
}: StampPerforationsProps) {
  if (userDensity <= 0 || width <= 0 || height <= 0) return null

  const d = buildPerforationClipPathD(width, height, userDensity)
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
