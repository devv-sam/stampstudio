// everything is in svg units: the disc is 100 wide, centered on 50,50

export type StraightSlot = "top" | "bottom" | "left" | "right";
export type TrackSlot = "rim" | "inner";
export type DiscSlot = StraightSlot | TrackSlot;

export type TextAlign = "left" | "center" | "right";

export type DiscTextItem = {
  id: string;
  content: string;
  slot: DiscSlot;
  /** degrees, 0 = top, clockwise. only used on tracks */
  angle: number;
  fontFamily: string;
  fontWeight: number;
  /** px on a 400px disc, so sizes read like the stamp's. svg units are this / DISC_TEXT_SCALE */
  fontSize: number;
  color: string;
  /** straight spots only, missing means center */
  align?: TextAlign;
};

export const DISC_TEXT_SCALE = 4;
/** line spacing for multi-line text, in ems */
export const LINE_HEIGHT = 1.25;
export const DISC_TEXT_SIZES = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40] as const;

export const STRAIGHT: StraightSlot[] = ["top", "bottom", "left", "right"];
export const SLOT_ORDER: DiscSlot[] = [...STRAIGHT, "rim", "inner"];

export const isStraight = (slot: DiscSlot): slot is StraightSlot =>
  (STRAIGHT as DiscSlot[]).includes(slot);

export const SLOT_DEFAULTS: Record<
  DiscSlot,
  { content: string; fontSize: number; angle: number }
> = {
  top: { content: "Untitled", fontSize: 20, angle: 0 },
  bottom: { content: "© 2026", fontSize: 11, angle: 0 },
  left: { content: "SIDE A", fontSize: 11, angle: 0 },
  right: { content: "STEREO", fontSize: 11, angle: 0 },
  rim: {
    content: "ALL RIGHTS RESERVED · UNAUTHORIZED COPYING PROHIBITED",
    fontSize: 9,
    angle: 180,
  },
  inner: { content: "CAT 001", fontSize: 9, angle: 180 },
};

export type DiscGeometry = {
  anchors: Record<StraightSlot, { x: number; y: number }>;
  tracks: Record<TrackSlot, number>;
  /** hole radius in svg units */
  hole: number;
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
    hole: h,
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

let measurer: CanvasRenderingContext2D | null = null;

/** width of one line in svg units, measured at 100px and scaled down */
export function measureLine(t: DiscTextItem, text: string, size = t.fontSize) {
  measurer ??= document.createElement("canvas").getContext("2d");
  if (!measurer) return 0;
  measurer.font = `${t.fontWeight} 100px '${t.fontFamily}'`;
  return (measurer.measureText(text).width * size) / DISC_TEXT_SCALE / 100;
}

// keep-out margins, in svg units
const EDGE = 48;
const HOLE_GAP = 1.5;
// a line may wrap this much of its circle before it runs into itself
const MAX_WRAP = 0.85;
const MIN_FIT = 3;
/** letter spacing on tracks, in ems. DiscText and export use the same */
export const TRACK_SPACING = 0.06;

/**
 * largest size, up to the one the user picked, at which the text stays inside
 * the disc and clear of the hole. the user's size is kept, so the text grows
 * back when its spot does.
 */
export function fittedSize(t: DiscTextItem, geo: DiscGeometry) {
  const lines = t.content.split("\n");
  const widest = (size: number) =>
    Math.max(...lines.map((line) => measureLine(t, line, size)));
  const lineHeight = (size: number) => (size / DISC_TEXT_SCALE) * LINE_HEIGHT;
  // arc text is spaced 0.06em apart, which adds up on long lines
  const arcWidest = (size: number) =>
    Math.max(
      ...lines.map(
        (line) =>
          measureLine(t, line, size) +
          TRACK_SPACING * (size / DISC_TEXT_SCALE) * Math.max(0, [...line].length - 1),
      ),
    );

  const fits = (size: number) => {
    const lh = lineHeight(size);
    if (isStraight(t.slot)) {
      const a = geo.anchors[t.slot];
      const hw = widest(size) / 2;
      const hh = (lines.length * lh) / 2;
      // every corner inside the disc
      const far = Math.max(
        ...[-1, 1].flatMap((sx) =>
          [-1, 1].map((sy) => Math.hypot(a.x + sx * hw - 50, a.y + sy * hh - 50)),
        ),
      );
      // the block's nearest point to the center stays out of the hole
      const nx = Math.max(Math.abs(a.x - 50) - hw, 0);
      const ny = Math.max(Math.abs(a.y - 50) - hh, 0);
      return far <= EDGE && Math.hypot(nx, ny) >= geo.hole + HOLE_GAP;
    }
    const r = geo.tracks[t.slot];
    const spread = ((lines.length - 1) / 2) * lh + lh / 2;
    const inner = r - spread;
    return (
      r + spread <= EDGE + 1 &&
      inner >= geo.hole + HOLE_GAP &&
      arcWidest(size) <= MAX_WRAP * 2 * Math.PI * inner
    );
  };

  if (fits(t.fontSize)) return t.fontSize;
  let lo = MIN_FIT;
  let hi = t.fontSize;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  // floor, rounding up could tip it back over the edge
  return Math.floor(lo * 10) / 10;
}

/** the item as drawn: same everything, size shrunk to fit its spot */
export const fitted = (t: DiscTextItem, geo: DiscGeometry): DiscTextItem => ({
  ...t,
  fontSize: fittedSize(t, geo),
});

/**
 * one row per line, stacked as a block centered on the spot. left and right
 * align the rows to the block's edge, so a list lines up.
 */
export function straightLines(t: DiscTextItem, anchor: { x: number; y: number }) {
  const lines = t.content.split("\n");
  const lh = (t.fontSize / DISC_TEXT_SCALE) * LINE_HEIGHT;
  const top = anchor.y - ((lines.length - 1) * lh) / 2;
  const align = t.align ?? "center";
  const half =
    align === "center"
      ? 0
      : Math.max(...lines.map((line) => measureLine(t, line))) / 2;
  const x = align === "left" ? anchor.x - half : align === "right" ? anchor.x + half : anchor.x;
  const textAnchor = align === "left" ? "start" : align === "right" ? "end" : "middle";
  return lines.map((text, i) => ({ text, x, y: top + i * lh, textAnchor }) as const);
}

/**
 * one arc per line, stacked around the track. the first line sits furthest out
 * on the top half and furthest in on the flipped bottom half, so both read top down.
 */
export function trackLines(t: DiscTextItem, radius: number) {
  const lines = t.content.split("\n");
  const lh = (t.fontSize / DISC_TEXT_SCALE) * LINE_HEIGHT;
  const flip = Math.cos((t.angle * Math.PI) / 180) < 0 ? -1 : 1;
  return lines.map((text, i) => ({
    text,
    r: radius + flip * (((lines.length - 1) / 2 - i) * lh),
  }));
}
