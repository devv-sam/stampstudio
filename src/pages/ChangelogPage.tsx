import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'

import { getChangelog, getLatestVersion } from '../data/changelog'
import {
  hasUnseenChangelog,
  markChangelogSeen,
} from '../utils/changelogStorage'

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Render Keep a Changelog list items; bold **name** spans become strong. */
function ChangelogItemText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        const bold = part.match(/^\*\*([^*]+)\*\*$/)
        if (bold) {
          return (
            <strong key={i} className="font-medium text-zinc-200">
              {bold[1]}
            </strong>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export function ChangelogPage() {
  const releases = getChangelog()
  const latestVersion = getLatestVersion()
  const [wasUnseen] = useState(() => hasUnseenChangelog(latestVersion))

  useEffect(() => {
    if (latestVersion) markChangelogSeen(latestVersion)
  }, [latestVersion])

  return (
    <>
      <Analytics />
      <div className="flex h-full min-h-0 flex-col bg-[#141416] text-zinc-100">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-5 py-3">
          <div className="flex items-baseline gap-3">
            <Link
              to="/"
              className="font-display text-base font-normal tracking-tight text-white lowercase transition-colors hover:text-zinc-300"
            >
              stampstudio
            </Link>
          </div>
          <Link
            to="/"
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Back to editor
          </Link>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto w-full max-w-2xl px-5 py-10 md:py-14">
            <h1 className="font-display text-3xl tracking-tight text-white md:text-4xl">
              Changelog
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              What&apos;s shipped in stampstudio, newest first.
            </p>

            {releases.length === 0 ? (
              <p className="mt-10 text-sm text-zinc-500">No releases yet.</p>
            ) : (
              <ol className="mt-10 flex flex-col gap-8">
                {releases.map((release, index) => {
                  const isLatest = index === 0
                  const showNew = isLatest && wasUnseen

                  return (
                    <li
                      key={release.version}
                      className={`rounded-xl border p-5 md:p-6 ${
                        isLatest
                          ? 'border-zinc-600/80 bg-zinc-900/60 ring-1 ring-white/5'
                          : 'border-zinc-800/80 bg-transparent'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="inline-flex items-center rounded-full border border-zinc-700/80 bg-zinc-950 px-2.5 py-0.5 font-mono text-[11px] font-medium text-zinc-200">
                          v{release.version}
                        </span>
                        {showNew ? (
                          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                            New
                          </span>
                        ) : isLatest ? (
                          <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                            Latest
                          </span>
                        ) : null}
                        <span className="text-[11px] text-zinc-500">
                          {formatDate(release.date)}
                        </span>
                      </div>

                      <div className="mt-5 space-y-5">
                        {release.sections.map((section) => (
                          <div key={section.heading}>
                            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                              {section.heading}
                            </h2>
                            <ul className="mt-2 space-y-2">
                              {section.items.map((item) => (
                                <li
                                  key={item}
                                  className="flex gap-2 text-sm leading-relaxed text-zinc-400"
                                >
                                  <span
                                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-600"
                                    aria-hidden
                                  />
                                  <span>
                                    <ChangelogItemText text={item} />
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
