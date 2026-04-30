import {
  type Canvas,
  Control,
  Group,
  type InteractiveFabricObject,
  Rect,
  controlsUtils,
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

type CornerKey = "tl" | "tr" | "bl" | "br";

/**
 * Quarter-arc handles (visual reference: subtle arc outside rounded corners).
 */
function createArcCornerRender(corner: CornerKey) {
  return (
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    styleOverride: unknown,
    fabricObject: InteractiveFabricObject,
  ) => {
    void styleOverride;
    void fabricObject;
    const radius = 14;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    let startAngle = 0;
    let endAngle = Math.PI / 2;
    let cx = left;
    let cy = top;

    switch (corner) {
      case "tl":
        cx = left + radius * 0.45;
        cy = top + radius * 0.45;
        startAngle = Math.PI;
        endAngle = Math.PI * 1.5;
        break;
      case "tr":
        cx = left - radius * 0.45;
        cy = top + radius * 0.45;
        startAngle = Math.PI * 1.5;
        endAngle = Math.PI * 2;
        break;
      case "br":
        cx = left - radius * 0.45;
        cy = top - radius * 0.45;
        startAngle = 0;
        endAngle = Math.PI / 2;
        break;
      case "bl":
        cx = left + radius * 0.45;
        cy = top - radius * 0.45;
        startAngle = Math.PI / 2;
        endAngle = Math.PI;
        break;
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.stroke();
    ctx.restore();
  };
}

/**
 * Corner-only scaling with minimal arc handles (hides mids + rotation).
 */
export function applyStampResizeHandles(stamp: Group) {
  const defaults = controlsUtils.createObjectDefaultControls();
  const corners: CornerKey[] = ["tl", "tr", "bl", "br"];

  for (const key of corners) {
    const base = defaults[key];
    stamp.controls[key] = new Control({
      x: base.x,
      y: base.y,
      actionHandler: base.actionHandler,
      cursorStyleHandler: base.cursorStyleHandler,
      actionName: base.actionName,
      render: createArcCornerRender(key),
      offsetX: base.offsetX,
      offsetY: base.offsetY,
      sizeX: 28,
      sizeY: 28,
      touchSizeX: 36,
      touchSizeY: 36,
    });
  }

  stamp.setControlsVisibility({
    tl: true,
    tr: true,
    bl: true,
    br: true,
    ml: false,
    mr: false,
    mt: false,
    mb: false,
    mtr: false,
  });

  stamp.set({
    cornerSize: 28,
    touchCornerSize: 36,
    transparentCorners: true,
    hasBorders: false,
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderDashArray: [6, 4],
    lockRotation: true,
  });
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
    stroke: "rgba(15, 15, 20, 0.08)",
    strokeWidth: 1,
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
    subTargetCheck: true,
    objectCaching: false,
    lockMovementX: true,
    lockMovementY: true,
    lockRotation: true,
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

/**
 * Clamp scaled size to [effectiveMinSide, canvas*STAMP_MAX_CANVAS_FRACTION] per axis, then center.
 * If canvas is tiny, effective minimum is capped so scale never exceeds canvas max bounds.
 */
export function clampStampBoundsAndCenter(
  canvas: Canvas,
  stamp: Group,
  minSide = STAMP_MIN_SIDE,
  maxFrac = STAMP_MAX_CANVAS_FRACTION,
) {
  const baseW = STAMP_BASE_WIDTH;
  const baseH = STAMP_BASE_HEIGHT;
  const cw = canvas.getWidth();
  const ch = canvas.getHeight();
  const maxSw = cw * maxFrac;
  const maxSh = ch * maxFrac;
  /** Floor for each axis: at most `minSide`, but never forces width past canvas width */
  const minSwEff = Math.min(minSide, maxSw);
  const minShEff = Math.min(minSide, maxSh);

  let sw = stamp.getScaledWidth();
  let sh = stamp.getScaledHeight();

  sw = Math.min(maxSw, Math.max(minSwEff, sw));
  sh = Math.min(maxSh, Math.max(minShEff, sh));

  stamp.set({ scaleX: sw / baseW, scaleY: sh / baseH });
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
