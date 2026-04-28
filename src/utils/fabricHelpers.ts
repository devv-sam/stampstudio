import {
  type Canvas,
  Control,
  type InteractiveFabricObject,
  Rect,
  controlsUtils,
} from 'fabric'

/** Fabric object name used to identify the stamp artboard */
export const STAMP_NAME = 'stampstudio-stamp'

type CornerKey = 'tl' | 'tr' | 'bl' | 'br'

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
    void styleOverride
    void fabricObject
    const radius = 14
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'

    let startAngle = 0
    let endAngle = Math.PI / 2
    let cx = left
    let cy = top

    switch (corner) {
      case 'tl':
        cx = left + radius * 0.45
        cy = top + radius * 0.45
        startAngle = Math.PI
        endAngle = Math.PI * 1.5
        break
      case 'tr':
        cx = left - radius * 0.45
        cy = top + radius * 0.45
        startAngle = Math.PI * 1.5
        endAngle = Math.PI * 2
        break
      case 'br':
        cx = left - radius * 0.45
        cy = top - radius * 0.45
        startAngle = 0
        endAngle = Math.PI / 2
        break
      case 'bl':
        cx = left + radius * 0.45
        cy = top - radius * 0.45
        startAngle = Math.PI / 2
        endAngle = Math.PI
        break
    }

    ctx.beginPath()
    ctx.arc(cx, cy, radius, startAngle, endAngle)
    ctx.stroke()
    ctx.restore()
  }
}

/**
 * Corner-only scaling with minimal arc handles (hides mids + rotation).
 */
export function applyStampResizeHandles(stamp: Rect) {
  const defaults = controlsUtils.createObjectDefaultControls()
  const corners: CornerKey[] = ['tl', 'tr', 'bl', 'br']

  for (const key of corners) {
    const base = defaults[key]
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
    })
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
  })

  stamp.set({
    cornerSize: 28,
    touchCornerSize: 36,
    transparentCorners: true,
    borderColor: 'rgba(255,255,255,0.35)',
    borderDashArray: [6, 4],
    lockRotation: true,
  })
}

export function createInitialStampRect() {
  return new Rect({
    name: STAMP_NAME,
    left: 200,
    top: 120,
    width: 420,
    height: 300,
    rx: 28,
    ry: 28,
    fill: '#ffffff',
    stroke: 'rgba(15, 15, 20, 0.08)',
    strokeWidth: 1,
    originX: 'left',
    originY: 'top',
    selectable: true,
    evented: true,
    objectCaching: false,
  })
}

export function getStampBoundsOnCanvas(_canvas: Canvas, stamp: Rect) {
  const rect = stamp.getBoundingRect()
  return {
    left: Math.max(0, Math.floor(rect.left)),
    top: Math.max(0, Math.floor(rect.top)),
    width: Math.max(1, Math.ceil(rect.width)),
    height: Math.max(1, Math.ceil(rect.height)),
  }
}
