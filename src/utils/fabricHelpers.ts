import {
  type Canvas,
  type FabricObject,
  type InteractiveFabricObject,
  FixedLayout,
  Group,
  LayoutManager,
  Pattern,
  Rect,
} from "fabric";

import "./selectionControls";

/** Fabric object name used to identify the stamp artboard */
export const STAMP_NAME = "stampstudio-stamp";
/** Fabric object name used to identify the stamp background child. */
export const STAMP_BG_NAME = "stampstudio-bg";

/** Default stamp size (local width / height before scale). */
export const STAMP_BASE_WIDTH = 420;
export const STAMP_BASE_HEIGHT = 300;

/** Text stays this far inside the stamp, clear of the perforations and resize rail. */
export const STAMP_SAFE_INSET = 16;

/** Minimum scaled width and height on the canvas. */
export const STAMP_MIN_SIDE = 90;

/** Max stamp size as a fraction of the Fabric canvas (width / height independently). */
export const STAMP_MAX_CANVAS_FRACTION = 0.85;

/** Resizing lives in the DOM edge handles, so Fabric draws no controls. */
export function disableStampControls(stamp: Group) {
  stamp.set({ hasControls: false, hasBorders: false, lockRotation: true });
}

export function createStampGroup() {
  const bgRect = new Rect({
    name: STAMP_BG_NAME,
    left: 0,
    top: 0,
    width: STAMP_BASE_WIDTH,
    height: STAMP_BASE_HEIGHT,
    rx: 0,
    ry: 0,
    fill: "#ffffff",
    strokeWidth: 0,
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
    objectCaching: false,
  });

  const group = new Group([bgRect], {
    /** Fixed so adding or moving children never shifts the stamp's size or center. */
    layoutManager: new LayoutManager(new FixedLayout()),
    width: STAMP_BASE_WIDTH,
    height: STAMP_BASE_HEIGHT,
    left: 0,
    top: 0,
    originX: "center",
    originY: "center",
    /** Not selectable so a drag on bare stamp starts the selection marquee. */
    selectable: false,
    evented: true,
    /** Required (Fabric 6+) so pointer hit-testing returns nested text/frame objects, not only the group. */
    subTargetCheck: true,
    interactive: true,
    objectCaching: false,
    lockMovementX: true,
    lockMovementY: true,
    lockRotation: true,
    hoverCursor: "default",
    moveCursor: "default",
  });
  (group as Group & { name?: string }).name = STAMP_NAME;

  group.clipPath = new Rect({
    left: 0,
    top: 0,
    width: STAMP_BASE_WIDTH,
    height: STAMP_BASE_HEIGHT,
    originX: "center",
    originY: "center",
    rx: 0,
    ry: 0,
  });

  return group;
}

/** Patterns paint from the rect's top-left, so this centers a cover-fit image. */
export function coverPatternTransform(
  image: { width: number; height: number },
  width: number,
  height: number,
): [number, number, number, number, number, number] {
  const scale = Math.max(width / image.width, height / image.height);
  return [
    scale,
    0,
    0,
    scale,
    (width - image.width * scale) / 2,
    (height - image.height * scale) / 2,
  ];
}

/** Resize the artboard itself. The group stays at scale 1 so its contents never stretch. */
export function setStampArtboard(stamp: Group, width: number, height: number) {
  const bg = getStampBgRect(stamp);
  bg?.set({ width, height, left: 0, top: 0 });
  stamp.clipPath?.set({ width, height });
  stamp.set({ width, height, scaleX: 1, scaleY: 1 });

  const fill = bg?.fill;
  if (fill instanceof Pattern) {
    fill.patternTransform = coverPatternTransform(
      fill.source as HTMLImageElement,
      width,
      height,
    );
    bg?.set("dirty", true);
  }
}

/** Stops scaling once the object's rotated bounds reach a stamp edge. */
export function capScaleToStamp(obj: FabricObject, stamp: Group, inset = 0) {
  const center = obj.getCenterPoint();
  const stampCenter = stamp.getCenterPoint();
  const roomX = stamp.width / 2 - inset - Math.abs(center.x - stampCenter.x);
  const roomY = stamp.height / 2 - inset - Math.abs(center.y - stampCenter.y);
  // already past the edge, e.g. the stamp shrank around it, so leave it alone
  if (roomX <= 0 || roomY <= 0) return;

  const angle = (obj.angle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const boundsW = obj.width * cos + obj.height * sin;
  const boundsH = obj.width * sin + obj.height * cos;
  const maxScale = Math.min((roomX * 2) / boundsW, (roomY * 2) / boundsH);

  if (obj.scaleX > maxScale || obj.scaleY > maxScale) {
    obj.set({ scaleX: maxScale, scaleY: maxScale });
    obj.setCoords();
  }
}

export function getStampBgRect(stamp: Group) {
  return stamp
    .getObjects()
    .find(
      (obj) =>
        (obj as InteractiveFabricObject & { name?: string }).name ===
        STAMP_BG_NAME,
    ) as Rect | undefined;
}

/** Place the stamp group in the middle of the canvas (center origin). */
export function centerStampInCanvas(canvas: Canvas, stamp: Group) {
  const cw = canvas.getWidth();
  const ch = canvas.getHeight();
  stamp.set({
    left: cw / 2,
    top: ch / 2,
  });
  stamp.setCoords();
}

export type ClampStampBoundsOptions = {
  minSide?: number;
  maxFrac?: number;
};

/**
 * Clamp scaled size to [effectiveMinSide, stage*STAMP_MAX_CANVAS_FRACTION] per axis, then center.
 * Resizes the Fabric canvas to exactly the stamp's display size (stage-sized canvas is no longer used).
 *
 */
export function clampStampBoundsAndCenter(
  canvas: Canvas,
  stamp: Group,
  stageW: number,
  stageH: number,
  options?: ClampStampBoundsOptions,
): void {
  const minSide = options?.minSide ?? STAMP_MIN_SIDE;
  const maxFrac = options?.maxFrac ?? STAMP_MAX_CANVAS_FRACTION;
  const cw = Math.max(1, stageW);
  const ch = Math.max(1, stageH);
  const maxSw = cw * maxFrac;
  const maxSh = ch * maxFrac;
  /** Floor for each axis: at most `minSide`, but never forces width past stage width */
  const minSwEff = Math.min(minSide, maxSw);
  const minShEff = Math.min(minSide, maxSh);

  let sw = stamp.width;
  let sh = stamp.height;

  sw = Math.min(maxSw, Math.max(minSwEff, sw));
  sh = Math.min(maxSh, Math.max(minShEff, sh));

  const rw = Math.max(1, Math.round(sw));
  const rh = Math.max(1, Math.round(sh));

  setStampArtboard(stamp, rw, rh);
  canvas.setDimensions({ width: rw, height: rh });
  centerStampInCanvas(canvas, stamp);
  stamp.setCoords();
}

export function getStampBoundsOnCanvas(_canvas: Canvas, stamp: Group) {
  const rect = stamp.getBoundingRect();
  return {
    left: Math.max(0, Math.floor(rect.left)),
    top: Math.max(0, Math.floor(rect.top)),
    width: Math.max(1, Math.ceil(rect.width)),
    height: Math.max(1, Math.ceil(rect.height)),
  };
}
