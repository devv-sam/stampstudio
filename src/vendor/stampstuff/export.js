/**
 * Export a Sheet as a self-contained interactive embed.
 *
 * The emitted HTML has zero network dependencies: the OGL runtime + <stamp-sheet>
 * are inlined as one <script>, textures are base64 data URIs, and the config is
 * an inline JSON block. Open the file or paste the element — it's live and
 * draggable.
 *
 * `buildEmbedHTML` is pure (string in, string out) so it runs identically in the
 * browser (the author-mode Export button) and in Node (the example build script).
 */

/** Prevent an inlined string from prematurely closing the host <script>. */
function scriptSafe(str) {
  return String(str).replace(/<\/(script)/gi, '<\\/$1');
}

/**
 * Fold the author-mode auto-fit factor into plain `scale` so the exported
 * config is self-evident (scale is the one true size knob) and renders
 * correctly even on an older runtime that predates `baseScale`.
 */
export function flattenScale(config) {
  const stamps = (config.stamps || []).map((s) => {
    const { baseScale, ...rest } = s;
    return { ...rest, scale: +((s.scale ?? 1) * (baseScale ?? 1)).toFixed(4) };
  });
  return { ...config, stamps };
}

/**
 * Ensure every stamp's `src` is a base64 data URI. Uploaded stamps already are;
 * anything referenced by URL is fetched and encoded so the embed needs no network.
 */
export async function inlineTextures(config) {
  const stamps = await Promise.all(
    (config.stamps || []).map(async (s) => {
      if (!s.src || s.src.startsWith('data:')) return { ...s };
      const blob = await fetch(s.src).then((r) => r.blob());
      const dataUri = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(blob);
      });
      return { ...s, src: dataUri };
    })
  );
  return { ...config, stamps };
}

/**
 * Fill the embed template with config + runtime.
 * @param {string} template  embed-template.html contents (with __TOKENS__)
 * @param {object} opts      { config, runtimeJS, title }
 */
export function buildEmbedHTML(template, { config, runtimeJS, title = 'stampstuff' }) {
  const bg =
    config.background && config.background !== 'transparent'
      ? config.background
      : 'transparent';
  return template
    .replace('__TITLE__', scriptSafe(title))
    .replace('__BG__', bg)
    .replace('__CONFIG__', scriptSafe(JSON.stringify(config)))
    .replace('__RUNTIME__', () => scriptSafe(runtimeJS)); // fn: skip $-substitution
}

/** Trigger a browser download of the emitted HTML (author-mode only). */
export function downloadHTML(filename, html) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Full author-mode export: serialize the live sheet, inline textures, fetch the
 * built runtime bundle, assemble the single file, and download it.
 * @param {Sheet} sheet
 * @param {object} opts  { template, runtimeUrl, title, filename }
 */
export async function exportSheet(sheet, { template, runtimeUrl, title, filename } = {}) {
  const config = await inlineTextures(flattenScale(sheet.serialize()));
  // Cache-bust the runtime request: the vite dev server ignores the build
  // outDir in its watcher, so a plain URL can serve a stale cached transform
  // of an older runtime. A unique query forces a fresh read from disk.
  const bustedUrl =
    runtimeUrl + (runtimeUrl.includes('?') ? '&' : '?') + 'v=' + Date.now();
  let runtimeJS = await fetch(bustedUrl, { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error(`runtime bundle not found at ${runtimeUrl} — run "npm run build:embed" first`);
    return r.text();
  });
  // The dev server appends an inline base64 sourcemap to served JS; strip it so
  // the embed carries only the minified runtime, not ~5x its weight in map data.
  runtimeJS = runtimeJS.replace(/\n?\/\/# sourceMappingURL=data:.*$/s, '');
  const html = buildEmbedHTML(template, { config, runtimeJS, title });
  downloadHTML(filename || 'stampsheet-embed.html', html);
  return html;
}
