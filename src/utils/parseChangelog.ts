export type ChangelogSection = {
  heading: string
  items: string[]
}

export type ChangelogRelease = {
  version: string
  date: string
  sections: ChangelogSection[]
}

const RELEASE_HEADING =
  /^##\s+\[([^\]]+)\]\s*-\s*(\d{4}-\d{2}-\d{2})\s*$/
const SECTION_HEADING = /^###\s+(.+)\s*$/
const LIST_ITEM = /^-\s+(.+)\s*$/

/**
 * Parse Keep a Changelog markdown into structured releases.
 * Ignores the top-level `# Changelog` title and footer link refs.
 */
export function parseChangelog(markdown: string): ChangelogRelease[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const releases: ChangelogRelease[] = []

  let current: ChangelogRelease | null = null
  let currentSection: ChangelogSection | null = null

  const flushSection = () => {
    if (current && currentSection && currentSection.items.length > 0) {
      current.sections.push(currentSection)
    }
    currentSection = null
  }

  const flushRelease = () => {
    flushSection()
    if (current) releases.push(current)
    current = null
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    // Footer refs like `[1.0.0]: https://...`
    if (/^\[[^\]]+\]:\s+\S+/.test(line.trim())) continue

    const releaseMatch = line.match(RELEASE_HEADING)
    if (releaseMatch) {
      flushRelease()
      current = {
        version: releaseMatch[1]!,
        date: releaseMatch[2]!,
        sections: [],
      }
      continue
    }

    if (!current) continue

    const sectionMatch = line.match(SECTION_HEADING)
    if (sectionMatch) {
      flushSection()
      currentSection = { heading: sectionMatch[1]!.trim(), items: [] }
      continue
    }

    const itemMatch = line.match(LIST_ITEM)
    if (itemMatch && currentSection) {
      currentSection.items.push(itemMatch[1]!.trim())
    }
  }

  flushRelease()
  return releases
}

export function getLatestVersion(releases: ChangelogRelease[]): string | null {
  return releases[0]?.version ?? null
}
