import changelogMd from '../../CHANGELOG.md?raw'

import {
  getLatestVersion as latestFromReleases,
  parseChangelog,
  type ChangelogRelease,
} from '../utils/parseChangelog'

export type { ChangelogRelease, ChangelogSection } from '../utils/parseChangelog'

let cached: ChangelogRelease[] | null = null

export function getChangelog(): ChangelogRelease[] {
  if (!cached) {
    cached = parseChangelog(changelogMd)
  }
  return cached
}

export function getLatestVersion(): string | null {
  return latestFromReleases(getChangelog())
}
