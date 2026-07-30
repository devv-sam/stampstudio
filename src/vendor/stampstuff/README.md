# vendored: @devv-sam/stampstuff

This is a **vendored copy** of the `stampstuff` runtime (the interactive WebGL
sticker sheet), not an npm dependency. It's vendored so the Vercel build needs
no GitHub Packages registry token, and so the HTML-export path can inline the
standalone bundle as a static asset.

## What's here
- `Sheet.js`, `Stamp.js`, `input.js`, `index.js`, `react.js` — runtime source
  (Vite bundles it; `ogl` is a real dependency in this repo's package.json).
- `export.js` — `exportSheet` / `buildEmbedHTML` for the "export as HTML" action.
- `shaders/*` — imported via Vite `?raw`.
- `*.d.ts` — type declarations (kept beside the matching `.js`).
- `embed-template.html` — imported via `?raw` by `export.js` callers.

The standalone runtime bundle lives at `public/stampstuff/stampsheet.js` and is
fetched + inlined by `exportSheet` (`runtimeUrl: '/stampstuff/stampsheet.js'`).

## Refreshing
Source of truth: `/Users/proje/stampstuff`. To update:

```bash
cd /Users/proje/stampstuff && npm run build
# then re-copy:
cp src/{Sheet,Stamp,input,index,export,react}.js  <repo>/src/vendor/stampstuff/
cp src/shaders/*                                    <repo>/src/vendor/stampstuff/shaders/
cp dist/types/{Sheet,Stamp,input,index,export,react}.d.ts <repo>/src/vendor/stampstuff/
cp embed-template.html                              <repo>/src/vendor/stampstuff/
cp dist/stampsheet.js                               <repo>/public/stampstuff/stampsheet.js
```
