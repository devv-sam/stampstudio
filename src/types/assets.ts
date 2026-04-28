/**
 * An image the user has uploaded into the editor. Each asset is the
 * cropped, ready-to-use data URL — never the raw upload — so swapping roles
 * (frame ↔ background) is a pure metadata change and never requires
 * re-cropping.
 */
export type ImageAssetRole = 'background' | 'frame' | 'unused'

export type ImageAsset = {
  id: string
  /** Cropped image as a data URL (always base64, no remote fetches). */
  src: string
  /** Cropped image dimensions in pixels (post-crop, pre-render). */
  width: number
  height: number
  role: ImageAssetRole
  /** ISO timestamp; lets us order the asset list deterministically. */
  createdAt: string
}
