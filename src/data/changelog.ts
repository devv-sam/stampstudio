export type ChangelogFeature = {
  name: string
  description: string
}

export type ChangelogEntry = {
  version: string
  title: string
  /** Headline on the compact first-visit stamp. */
  compactTitle: string
  /** Subtitle under the logo in the grass hero — avoid repeating the version string. */
  heroSubtitle: string
  date: string
  teaser: string
  /** Short highlights shown on the compact first-visit stamp. */
  compactNotes: ChangelogFeature[]
  features: ChangelogFeature[]
  details?: ChangelogFeature[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0',
    title: 'v1.0 is here!',
    compactTitle: "what's new in v.1.0",
    heroSubtitle: 'design stamps in your browser',
    date: 'June 2026',
    teaser: '',
    compactNotes: [
      {
        name: 'Outline mode',
        description: 'Wireframe every layer on your stamp. ⌘Y to toggle.',
      },
      {
        name: 'Shaders',
        description: 'Halftone dots, fluted glass, CMYK, and dithering.',
      },
    ],
    features: [
      {
        name: 'Outline mode',
        description: 'Wireframe view of every layer on your stamp. Press ⌘Y.',
      },
      {
        name: 'Shaders',
        description: 'Halftone dots, fluted glass, CMYK halftone, and dithering.',
      },
      {
        name: 'Typography',
        description: 'Searchable fonts, weights, sizes, and color presets.',
      },
      {
        name: 'Frames & backgrounds',
        description: 'Upload images, crop, and layer them on the canvas.',
      },
      {
        name: 'Export',
        description: 'PNG, JPEG, and SVG at multiple resolutions.',
      },
      {
        name: 'Zoom & presets',
        description: 'Canvas zoom plus square, landscape, and portrait sizes.',
      },
    ],
    details: [
      {
        name: 'Responsive layout',
        description: 'Holds up on mobile and desktop.',
      },
      {
        name: 'Snap-to-preset sizing',
        description: 'Visual guides while resizing your stamp.',
      },
      {
        name: 'Perforated edges',
        description: 'Adjustable notch density around the artboard.',
      },
      {
        name: 'Fill controls',
        description: 'Solid colors and image backgrounds with a curated palette.',
      },
      {
        name: 'Panel polish',
        description: 'Cleaner typography controls and hidden scrollbars.',
      },
    ],
  },
]

export const LATEST_VERSION = CHANGELOG[0]?.version ?? '1.0'
