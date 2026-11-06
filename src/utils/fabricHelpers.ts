import {
  type Canvas,
  type InteractiveFabricObject,
  Group,
  Rect,
} from "fabric";

/** Fabric object name used to identify the stamp artboard */
export const STAMP_NAME = "stampstudio-stamp";
/** Fabric object name used to identify the stamp background child. */
export const STAMP_BG_NAME = "stampstudio-bg";

/** Default stamp size (local width / height before scale). */
export const STAMP_BASE_WIDTH = 420;
export const STAMP_BASE_HEIGHT = 300;

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
    left: 0,
    top: 0,
    originX: "center",
    originY: "center",
    selectable: true,
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
  const baseW = STAMP_BASE_WIDTH;
  const baseH = STAMP_BASE_HEIGHT;
  const cw = Math.max(1, stageW);
  const ch = Math.max(1, stageH);
  const maxSw = cw * maxFrac;
  const maxSh = ch * maxFrac;
  /** Floor for each axis: at most `minSide`, but never forces width past stage width */
  const minSwEff = Math.min(minSide, maxSw);
  const minShEff = Math.min(minSide, maxSh);

  let sw = stamp.getScaledWidth();
  let sh = stamp.getScaledHeight();

  sw = Math.min(maxSw, Math.max(minSwEff, sw));
  sh = Math.min(maxSh, Math.max(minShEff, sh));

  const rw = Math.max(1, Math.round(sw));
  const rh = Math.max(1, Math.round(sh));

  stamp.set({ scaleX: rw / baseW, scaleY: rh / baseH });
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
