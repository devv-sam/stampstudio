import { LATEST_VERSION } from '../data/changelog'

const STORAGE_KEY = `stampstudio-changelog-seen-v${LATEST_VERSION}`

export function markChangelogSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* ignore quota / private mode */
  }
}

export function hasSeenChangelog(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}
