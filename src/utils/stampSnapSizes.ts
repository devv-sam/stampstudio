/**
 * When each axis is within this distance of a preset, the stamp **commits**
 * to that size (magnetic snap).
 */
export const STAMP_SNAP_COMMIT_THRESHOLD_PX = 17

/**
 * Larger zone: dashed **preview** outline appears while resizing, before the
 * commit snap fires.
 */
export const STAMP_SNAP_PREVIEW_THRESHOLD_PX = 48

/** Outset around the target size so the dashed guide is easier to see (px per side). */
export const STAMP_SNAP_GUIDE_OUTSET_PX = 12

export type StampSnapPreset = { w: number; h: number }

export const SNAP_PRESETS_SQUARE: readonly StampSnapPreset[] = [
  { w: 90, h: 90 },
  { w: 140, h: 140 },
  { w: 200, h: 200 },
  { w: 280, h: 280 },
]

export const SNAP_PRESETS_LANDSCAPE: readonly StampSnapPreset[] = [
  { w: 140, h: 90 },
  { w: 220, h: 140 },
  { w: 300, h: 190 },
  { w: 420, h: 260 },
]

export const SNAP_PRESETS_PORTRAIT: readonly StampSnapPreset[] = [
  { w: 90, h: 140 },
  { w: 140, h: 220 },
  { w: 190, h: 300 },
  { w: 260, h: 420 },
]

/** De-duplicated list for snapping logic */
export const STAMP_SNAP_PRESETS: readonly StampSnapPreset[] = [
  ...SNAP_PRESETS_SQUARE,
  ...SNAP_PRESETS_LANDSCAPE,
  ...SNAP_PRESETS_PORTRAIT,
]

/**
 * Pick preset within Chebyshev distance `threshold`; tie-break by L2².
 */
export function findBestSnapPreset(
  sw: number,
  sh: number,
  presets: readonly StampSnapPreset[],
  threshold: number,
): StampSnapPreset | null {
  let best: StampSnapPreset | null = null
  let bestSq = Infinity
  for (const p of presets) {
    const dw = Math.abs(sw - p.w)
    const dh = Math.abs(sh - p.h)
    if (dw > threshold || dh > threshold) continue
    const sq = dw * dw + dh * dh
    if (sq < bestSq) {
      bestSq = sq
      best = p
    }
  }
  return best
}
