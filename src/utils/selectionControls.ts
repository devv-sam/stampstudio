import {
  Control,
  InteractiveFabricObject,
  controlsUtils,
  type TDegree,
} from 'fabric'

const ACCENT = '#3b84ee'
const ROTATE_ZONE = 22
const ROTATE_REACH = 12
const CORNER_SIZE = 6
const CORNER_HIT = 14
const EDGE_HIT = 10
const EDGE_HIT_TOUCH = 20

// no visible rotate handle, hovering just outside a corner rotates, same as figma
function rotateZone(x: number, y: number) {
  return new Control({
    x,
    y,
    offsetX: Math.sign(x) * ROTATE_REACH,
    offsetY: Math.sign(y) * ROTATE_REACH,
    sizeX: ROTATE_ZONE,
    sizeY: ROTATE_ZONE,
    actionName: 'rotate',
    actionHandler: controlsUtils.rotationWithSnapping,
    cursorStyleHandler: controlsUtils.rotationStyleHandler,
    render: () => {},
  })
}

// an invisible strip along one side, sized to the object between its corners
class EdgeControl extends Control {
  calcCornerCoords(
    angle: TDegree,
    cornerSize: number,
    centerX: number,
    centerY: number,
    isTouch: boolean,
    object: InteractiveFabricObject,
  ) {
    const zoom = object.getViewportTransform()[0]
    const alongX = this.y !== 0
    const side = alongX ? object.getScaledWidth() : object.getScaledHeight()
    const length = Math.max(1, side * zoom - CORNER_HIT)
    const thickness = isTouch ? EDGE_HIT_TOUCH : EDGE_HIT
    this.sizeX = this.touchSizeX = alongX ? length : thickness
    this.sizeY = this.touchSizeY = alongX ? thickness : length
    return super.calcCornerCoords(
      angle,
      cornerSize,
      centerX,
      centerY,
      isTouch,
      object,
    )
  }
}

function edge(x: number, y: number) {
  return new EdgeControl({
    x,
    y,
    actionName: 'scale',
    actionHandler: x ? controlsUtils.scalingX : controlsUtils.scalingY,
    cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
    render: () => {},
  })
}

// the handle draws small, the target around it stays easy to grab
function corner(control: Control) {
  const calc = control.calcCornerCoords.bind(control)
  control.calcCornerCoords = (angle, size, x, y, isTouch, object) =>
    calc(angle, isTouch ? size : CORNER_HIT, x, y, isTouch, object)
  return control
}

Object.assign(InteractiveFabricObject.ownDefaults, {
  borderColor: ACCENT,
  borderScaleFactor: 1.5,
  borderOpacityWhenMoving: 1,
  cornerColor: '#ffffff',
  cornerStrokeColor: ACCENT,
  cornerStyle: 'rect',
  cornerSize: CORNER_SIZE,
  touchCornerSize: 24,
  transparentCorners: false,
  padding: 0,
  lockScalingFlip: true,
  snapAngle: 90,
  snapThreshold: 4,
})

InteractiveFabricObject.createControls = () => {
  const { tl, tr, bl, br } = controlsUtils.createObjectDefaultControls()
  return {
    controls: {
      rotateTl: rotateZone(-0.5, -0.5),
      rotateTr: rotateZone(0.5, -0.5),
      rotateBl: rotateZone(-0.5, 0.5),
      rotateBr: rotateZone(0.5, 0.5),
      ml: edge(-0.5, 0),
      mr: edge(0.5, 0),
      mt: edge(0, -0.5),
      mb: edge(0, 0.5),
      tl: corner(tl),
      tr: corner(tr),
      bl: corner(bl),
      br: corner(br),
    },
  }
}
