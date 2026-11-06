import { Control, InteractiveFabricObject, controlsUtils } from 'fabric'

const ACCENT = '#3b84ee'
const ROTATE_ZONE = 22
const ROTATE_REACH = 12

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

Object.assign(InteractiveFabricObject.ownDefaults, {
  borderColor: ACCENT,
  borderScaleFactor: 1.5,
  borderOpacityWhenMoving: 1,
  cornerColor: '#ffffff',
  cornerStrokeColor: ACCENT,
  cornerStyle: 'rect',
  cornerSize: 9,
  touchCornerSize: 24,
  transparentCorners: false,
  padding: 0,
})

InteractiveFabricObject.createControls = () => {
  const { tl, tr, bl, br } = controlsUtils.createObjectDefaultControls()
  return {
    controls: {
      rotateTl: rotateZone(-0.5, -0.5),
      rotateTr: rotateZone(0.5, -0.5),
      rotateBl: rotateZone(-0.5, 0.5),
      rotateBr: rotateZone(0.5, 0.5),
      tl,
      tr,
      bl,
      br,
    },
  }
}
