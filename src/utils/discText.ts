// everything is in svg units: the disc is 100 wide, centered on 50,50

export type StraightSlot = "top" | "bottom" | "left" | "right";
export type TrackSlot = "rim" | "inner";
export type DiscSlot = StraightSlot | TrackSlot;

export type DiscTextItem = {
  id: string;
  content: string;
  slot: DiscSlot;
  /** degrees, 0 = top, clockwise. only used on tracks */
  angle: number;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  color: string;
};

export const STRAIGHT: StraightSlot[] = ["top", "bottom", "left", "right"];
export const SLOT_ORDER: DiscSlot[] = [...STRAIGHT, "rim", "inner"];

export const isStraight = (slot: DiscSlot): slot is StraightSlot =>
  (STRAIGHT as DiscSlot[]).includes(slot);

export const SLOT_DEFAULTS: Record<
  DiscSlot,
  { content: string; fontSize: number; angle: number }
> = {
  top: { content: "Untitled", fontSize: 5, angle: 0 },
  bottom: { content: "© 2026", fontSize: 2.8, angle: 0 },
  left: { content: "SIDE A", fontSize: 2.8, angle: 0 },
  right: { content: "STEREO", fontSize: 2.8, angle: 0 },
  rim: {
    content: "ALL RIGHTS RESERVED · UNAUTHORIZED COPYING PROHIBITED",
    fontSize: 2.2,
    angle: 180,
  },
  inner: { content: "CAT 001", fontSize: 2.2, angle: 180 },
};

export type DiscGeometry = {
  anchors: Record<StraightSlot, { x: number; y: number }>;
  tracks: Record<TrackSlot, number>;
};

/** hole is the cutout diameter in % of the disc, rings/spread match the ring sliders */
export function discGeometry(
  hole: number,
  rings: number,
  spread: number,
): DiscGeometry {
  const h = hole / 2;
  // halfway between the rim and the hole edge
  const band = (50 - h) / 2;
  const rim = 46;
  return {
    anchors: {
      top: { x: 50, y: band },
      bottom: { x: 50, y: 100 - band },
      left: { x: band, y: 50 },
      right: { x: 100 - band, y: 50 },
    },
    tracks: {
      rim,
      // just outside the outermost ring
      inner: Math.min(h + rings * spread + 2.5, rim - 4),
    },
  };
}

const point = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${50 + r * Math.sin(a)} ${50 - r * Math.cos(a)}`;
};

/**
 * a full circle whose halfway point sits at `deg`, so startOffset 50% centers
 * the text there. the bottom half runs counter-clockwise to keep text upright.
 */
export function arcPath(r: number, deg: number) {
  const sweep = Math.cos((deg * Math.PI) / 180) < 0 ? 0 : 1;
  const start = point(r, deg + 180);
  const mid = point(r, deg);
  return `M ${start} A ${r} ${r} 0 1 ${sweep} ${mid} A ${r} ${r} 0 1 ${sweep} ${start}`;
}

/** closest slot to a point, with the angle it lands at on a track */
export function nearestSlot(geo: DiscGeometry, x: number, y: number) {
  const d = Math.hypot(x - 50, y - 50);
  const angle = (Math.atan2(x - 50, 50 - y) * 180) / Math.PI;
  let best: { slot: DiscSlot; angle: number; dist: number } = {
    slot: "top",
    angle: 0,
    dist: Infinity,
  };
  for (const slot of STRAIGHT) {
    const a = geo.anchors[slot];
    const dist = Math.hypot(x - a.x, y - a.y);
    if (dist < best.dist) best = { slot, angle: 0, dist };
  }
  for (const slot of ["rim", "inner"] as TrackSlot[]) {
    const dist = Math.abs(d - geo.tracks[slot]);
    if (dist < best.dist) best = { slot, angle, dist };
  }
  return best;
}

/** moves one item, and swaps out whoever already held a straight slot */
export function moveItem(
  items: DiscTextItem[],
  id: string,
  to: { slot: DiscSlot; angle: number },
  from: { slot: DiscSlot; angle: number },
) {
  return items.map((t) => {
    if (t.id === id) return { ...t, ...to };
    if (isStraight(to.slot) && t.slot === to.slot) return { ...t, ...from };
    return t;
  });
}
