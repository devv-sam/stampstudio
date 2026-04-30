import type { Canvas, Group } from 'fabric'

export type StampCanvasApi = {
  canvas: Canvas
  stamp: Group
}

export type StampCanvasRegistration = {
  register: (api: StampCanvasApi) => void
  unregister: () => void
}
