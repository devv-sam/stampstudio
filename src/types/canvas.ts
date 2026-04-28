import type { Canvas } from 'fabric'
import type { Rect } from 'fabric'

export type StampCanvasApi = {
  canvas: Canvas
  stamp: Rect
}

export type StampCanvasRegistration = {
  register: (api: StampCanvasApi) => void
  unregister: () => void
}
