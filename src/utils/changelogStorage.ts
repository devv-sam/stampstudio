const STORAGE_KEY = 'stampstudio-changelog-last-seen'

/** Compare dotted numeric versions (e.g. 1.0.0 < 1.1.0). Returns negative if a < b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const pb = b.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function getLastSeenVersion(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function markChangelogSeen(version: string) {
  try {
    localStorage.setItem(STORAGE_KEY, version)
  } catch {
    /* ignore quota / private mode */
  }
}

export function hasUnseenChangelog(latestVersion: string | null): boolean {
  if (!latestVersion) return false
  const lastSeen = getLastSeenVersion()
  if (!lastSeen) return true
  return compareVersions(lastSeen, latestVersion) < 0
}
