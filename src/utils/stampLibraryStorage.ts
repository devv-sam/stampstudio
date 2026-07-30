/**
 * A tiny "stamp library": the last few stamps the user actually downloaded.
 *
 * The studio only ever holds one live stamp in memory, so to let experiments
 * (the Stampsheet) work *with* previously made stamps we persist each exported
 * PNG/JPG (as a base64 data URL) the moment it's downloaded. We keep only the
 * most recent {@link STAMP_LIBRARY_LIMIT} — this is a convenience cache, not an
 * archive. All access is guarded so private-mode / quota errors never throw.
 */

const STORAGE_KEY = 'stampstudio-stamp-library'
export const STAMP_LIBRARY_LIMIT = 5

export interface StampLibraryEntry {
  id: string
  /** base64 data URL of the exported stamp (PNG keeps transparency for die-cut). */
  src: string
  width: number
  height: number
  createdAt: number
}

function readRaw(): StampLibraryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Defensive: only keep entries that look like a stamp record.
    return parsed.filter(
      (e): e is StampLibraryEntry =>
        e && typeof e.src === 'string' && e.src.startsWith('data:'),
    )
  } catch {
    return []
  }
}

/** Most-recent-first, capped at the limit. */
export function getStampLibrary(): StampLibraryEntry[] {
  return readRaw().slice(0, STAMP_LIBRARY_LIMIT)
}

/**
 * Record a freshly downloaded stamp. De-dupes by data URL (re-downloading the
 * same stamp just bumps it to the front) and caps the list at the limit.
 */
export function addStampToLibrary(entry: {
  src: string
  width: number
  height: number
}): StampLibraryEntry[] {
  if (!entry.src || !entry.src.startsWith('data:')) return getStampLibrary()
  try {
    const existing = readRaw().filter((e) => e.src !== entry.src)
    const record: StampLibraryEntry = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `stamp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      src: entry.src,
      width: Math.round(entry.width) || 0,
      height: Math.round(entry.height) || 0,
      createdAt: Date.now(),
    }
    const next = [record, ...existing].slice(0, STAMP_LIBRARY_LIMIT)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next
  } catch {
    // Quota (data URLs are heavy) or private mode — fail silently.
    return getStampLibrary()
  }
}

export function clearStampLibrary() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
