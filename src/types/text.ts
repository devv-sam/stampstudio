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
  {
    family: 'Libre Baskerville',
    label: 'Libre Baskerville',
    weights: [400, 700],
  },
  { family: 'Special Elite', label: 'Special Elite', weights: [400] },
  { family: 'Playfair Display', label: 'Playfair Display', weights: [400, 700] },
  { family: 'Bebas Neue', label: 'Bebas Neue', weights: [400] },
  { family: 'Oswald', label: 'Oswald', weights: [300, 400, 500, 600] },
  { family: 'Courier Prime', label: 'Courier Prime', weights: [400, 700] },
  { family: 'Space Grotesk', label: 'Space Grotesk', weights: [400, 500, 700] },
  { family: 'IM Fell English', label: 'IM Fell English', weights: [400] },
]

/**
 * Typography size presets (px) for the text panel dropdown — discrete steps similar to Figma’s type menu,
 * not a continuous slider (finer gaps at smaller sizes, larger jumps at poster sizes).
 */
export const STAMP_FONT_SIZES: readonly number[] = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96,
]
