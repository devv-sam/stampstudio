/**
 * Fold the author-mode auto-fit factor into plain `scale` so the exported
 * config is self-evident (scale is the one true size knob) and renders
 * correctly even on an older runtime that predates `baseScale`.
 */
export function flattenScale(config: any): any;
/**
 * Ensure every stamp's `src` is a base64 data URI. Uploaded stamps already are;
 * anything referenced by URL is fetched and encoded so the embed needs no network.
 */
export function inlineTextures(config: any): Promise<any>;
/**
 * Fill the embed template with config + runtime.
 * @param {string} template  embed-template.html contents (with __TOKENS__)
 * @param {object} opts      { config, runtimeJS, title }
 */
export function buildEmbedHTML(template: string, { config, runtimeJS, title }: object): string;
/** Trigger a browser download of the emitted HTML (author-mode only). */
export function downloadHTML(filename: any, html: any): void;
/**
 * Full author-mode export: serialize the live sheet, inline textures, fetch the
 * built runtime bundle, assemble the single file, and download it.
 * @param {Sheet} sheet
 * @param {object} opts  { template, runtimeUrl, title, filename }
 */
export function exportSheet(sheet: Sheet, { template, runtimeUrl, title, filename }?: object): Promise<string>;
