# Changelog

All notable changes to Stampstudio are documented here.

## [1.2.0] - 2026-08-04 — Stampsheet

### Added

- Stampsheet — a new experiment behind the flask icon in the canvas toolbar. Arrange your stamps on a sheet you can actually push around: pick one up and it lifts, tilts toward the drag, and settles back with a bounce.
- Stamp library — the last five stamps you export are kept and show up in the Stampsheet tray, sized exactly as they'll land on the sheet. Drag one onto the sheet to place it.
- Sheet settings, behind the sliders button: idle motion, hover lift, tilt on drag, whether stickers can be dragged at all, and the sheet background colour.
- Sticker settings — double-click any sticker on the sheet to style just that one: border width and colour, holographic foil with adjustable intensity, shadow, scale, and rotation. Every control previews live on the sheet as you drag it.
- Export the sheet as a self-contained interactive HTML file. No network dependencies — the runtime and images are inlined, so it stays draggable wherever you open or embed it.

### Changed

- The Stampsheet stamp tray scrolls with the mouse wheel. It previously only responded to a sideways drag, so stamps past the edge were easy to miss.

## [1.1.0] - 2026-07-16 — Canvas controls & smarter perforations

### Changed

- Perforations follow a density ratio instead of a fixed hole count — tall and wide stamps keep even spacing on every edge.
- Outline mode toggle moved into the properties panel under Snap to presets (⌘Y / Ctrl+Y still works).

### Fixed

- Snap to presets preference is remembered when you leave for Updates and come back.

## [1.0.0] - 2026-06-22 — Outline mode & bug fixes

### Added

- Outline Mode — wireframe view of every layer on your stamp (⌘Y / Ctrl+Y). Toggle in the bottom-left above the zoom bar.
- Properties panel scrollbar hidden when typography section expands — no more layout offset on color swatches.

## [0.1.0] - 2026-04-27 — Launch

### Added

- Shaders: halftone dots, fluted glass, CMYK halftone, and dithering.
- Typography: searchable fonts, weights, sizes, and color presets.
- Frames and backgrounds: upload images, crop, and layer on the canvas.
- Export: PNG, JPEG, and SVG at multiple resolutions.
- Canvas zoom (25%–400%) with pinch and Ctrl+scroll support.
- Size presets: square, landscape, and portrait with snap-to-preset guides.
- Perforated stamp edges with adjustable density.

### Fixed

- Properties panel scrollbar hidden when typography section expands — no more layout offset on color swatches.

### Changed

- Responsive layout improvements for mobile and desktop.
- Properties panel polish across fill, typography, and shader controls.
