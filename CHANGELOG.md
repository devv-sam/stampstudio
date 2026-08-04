# Changelog

All notable changes to Stampstudio are documented here.

## [1.2.0] - 2026-08-04 - Stampsheet

### Added

- Stampsheet, a new experiment behind the flask icon in the canvas toolbar. Arrange your stamps on a sheet and drag them around. They lift when you pick them up and settle back with a bounce.
- Stamp library: your last five exported stamps are saved and appear in the Stampsheet tray, ready to drag onto the sheet.
- Sheet settings for motion, hover lift, tilt on drag, dragging, and background color.
- Sticker settings: double-click a sticker to set its border, holographic foil, shadow, scale, and rotation. Changes preview live on the sheet.
- Export the sheet as a single interactive HTML file that works offline.

### Changed

- The Stampsheet tray now scrolls with the mouse wheel, not just a sideways drag.

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
