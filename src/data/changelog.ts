export type ChangelogEntry = {
  version: string
  title: string
  date: string
  highlights: string[]
  details?: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0',
    title: 'Stampstudio v1.0 is here',
    date: 'June 2026',
    highlights: [
      'Outline mode — wireframe view of every layer on your stamp (⌘Y)',
      'Shaders — halftone dots, fluted glass, CMYK halftone, and dithering',
      'Typography — searchable fonts, weights, sizes, and color presets',
      'Frames & backgrounds — upload images, crop, and layer on the canvas',
      'Export — PNG, JPEG, and SVG at multiple resolutions',
      'Zoom & presets — canvas zoom plus square, landscape, and portrait sizes',
    ],
    details: [
      'Responsive layout that holds up on mobile and desktop',
      'Snap-to-preset sizing with visual guides while resizing',
      'Perforated stamp edges with adjustable density',
      'Solid and image fills with a curated color palette',
      'Properties panel polish — hidden scrollbars, cleaner typography controls',
    ],
  },
]

export const LATEST_VERSION = CHANGELOG[0]?.version ?? '1.0'

export const GITHUB_RELEASES_URL =
  'https://github.com/devv-sam/stampstudio/releases'
