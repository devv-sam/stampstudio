/** Tiny PNG data URL of a flat color — used as shader `image` when there is no photo fill. */
const FALLBACK_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const cache = new Map<string, string>()

export function solidColorDataUrl(cssColor: string): string {
  const key = cssColor.trim() || '#ffffff'
  const hit = cache.get(key)
  if (hit) return hit

  if (typeof document === 'undefined') return FALLBACK_1PX

  const c = document.createElement('canvas')
  c.width = 2
  c.height = 2
  const ctx = c.getContext('2d')
  if (!ctx) return FALLBACK_1PX
  ctx.fillStyle = key
  ctx.fillRect(0, 0, 2, 2)
  const url = c.toDataURL('image/png')
  cache.set(key, url)
  return url
}
