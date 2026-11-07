# Changelog

All notable changes to Stampstudio are documented here.

## [2.0.1] - 2026-11-07 - Sharper prints

### Added

- Intaglio, a new shader that prints your stamp in fine lines with a single ink.
- Rotation now snaps to right angles.
- On phones, drag any side of the stamp to resize it.

### Fixed

- Shaders now export at full resolution instead of being stretched from screen size.
- The crop box now matches what gets applied, even if you don't move it.
- Match stamp now follows your stamp's real size.
- Text stays inside the stamp while you type.
- The sidebar tells you when a size is too big for your window, and large stamps no longer run under it.
- Removed a grey patch in the corner of the Water shader.
- Font weights show their full names, and font search is ready to type in.

## [2.0.0] - 2026-11-06 - A fresh new look

### Added

- A full redesign. Stampstudio now has a light, playful desk with floating controls, a new logo, and new colors.
- The logo changes shape and color when you click it, and the browser tab icon follows.
- Four new shaders: paper, water, engraving, and riso. Shader previews sit on the left and show their name on hover.
- A sidebar for canvas size, perforation, hex color, and opacity. It turns into text controls when you select text.
- A new color picker with opacity.
- Blend modes for shaders, right in the sidebar.
- Resize from the right or bottom edge, or drag the corner to keep proportions.
- Rotate text and frames by hovering just outside a corner.
- Drag across the stamp to select several things at once.
- Press Backspace or Delete to remove what you have selected.
- Export now has a stamp press animation with a little thunk.
- Updates now open in a popup right on the page.

### Changed

- Text stays sharp. Dragging a text corner changes the font size, and dragging a side stretches it.
- Resizing the stamp crops your background image instead of stretching it.
- Exported PNGs are sharper.
- Text and frames can no longer be scaled past the edge of the stamp.
- The outline view has its own button in the toolbar.
- Copy shows its result on the button.

### Fixed

- Clicks on the stamp no longer get lost when a shader and text are both on.
- Removed a faint line across the perforation holes.

### Removed

- Size presets and snapping. You can now type an exact size in the sidebar.
- Experiments are paused for now and coming back soon.

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
