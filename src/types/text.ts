export type TextLayer = {
  id: string
  content: string
  fontFamily: string
  fontWeight: number
  fontSize: number
  color: string
}

export type StampFont = {
  family: string
  label: string
  weights: number[]
}

export const STAMP_FONTS: StampFont[] = [
  { family: 'Inter', label: 'Inter', weights: [400, 500, 600] },
  { family: 'DM Serif Display', label: 'DM Serif Display', weights: [400] },
  { family: 'Playfair Display', label: 'Playfair Display', weights: [400, 700] },
  { family: 'Space Grotesk', label: 'Space Grotesk', weights: [400, 500, 700] },
  { family: 'Bebas Neue', label: 'Bebas Neue', weights: [400] },
  {
    family: 'Cormorant Garamond',
    label: 'Cormorant Garamond',
    weights: [400, 500, 600, 700],
  },
  { family: 'Syne', label: 'Syne', weights: [400, 500, 600, 700, 800] },
  { family: 'IBM Plex Mono', label: 'IBM Plex Mono', weights: [400, 500, 600, 700] },
  { family: 'Fraunces', label: 'Fraunces', weights: [400, 600, 700] },
  { family: 'Archivo Black', label: 'Archivo Black', weights: [400] },
  {
    family: 'Libre Baskerville',
    label: 'Libre Baskerville',
    weights: [400, 700],
  },
  {
    family: 'Unbounded',
    label: 'Unbounded',
    weights: [400, 500, 600, 700, 800, 900],
  },
]

/**
 * Typography size presets (px) for the text panel dropdown — discrete steps similar to Figma’s type menu,
 * not a continuous slider (finer gaps at smaller sizes, larger jumps at poster sizes).
 */
export const STAMP_FONT_SIZES: readonly number[] = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96,
]
