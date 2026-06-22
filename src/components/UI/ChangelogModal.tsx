import { ArrowRight, X } from 'lucide-react'
import { useState } from 'react'

import {
  CHANGELOG,
  GITHUB_RELEASES_URL,
  type ChangelogEntry,
} from '../../data/changelog'
import { hasSeenChangelog, markChangelogSeen } from '../../utils/changelogStorage'
import { Modal } from './Modal'

function ChangelogItem({ entry }: { entry: ChangelogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const hasMore = (entry.details?.length ?? 0) > 0
  const visibleItems = expanded
    ? [...entry.highlights, ...(entry.details ?? [])]
    : entry.highlights

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-900 to-[#101010] px-6 py-8 text-center">
        <p className="font-display text-2xl tracking-tight text-white">
          stampstudio
        </p>
        <p className="mt-1 text-xs text-zinc-500">version {entry.version}</p>
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(255,255,255,0.08), transparent)',
          }}
        />
      </div>

      <span className="inline-flex w-fit items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-emerald-400">
        v{entry.version}
      </span>

      <h2
        id="changelog-title"
        className="text-lg font-semibold tracking-tight text-white"
      >
        {entry.title}
      </h2>

      <ul className="flex flex-col gap-2.5 text-sm leading-relaxed text-zinc-300">
        {visibleItems.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-zinc-600" aria-hidden>
              →
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex w-fit items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
        >
          {expanded ? 'Show less' : 'View all updates'}
          <ArrowRight
            className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </button>
      ) : null}
    </div>
  )
}

export function ChangelogModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const latest = CHANGELOG[0]
  if (!latest) return null

  return (
    <Modal open={open} onClose={onClose} labelledBy="changelog-title">
      <div className="relative flex max-h-[min(80vh,640px)] flex-col">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-900/90 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-6 pb-6 pt-5">
          <ChangelogItem entry={latest} />
        </div>

        <div className="border-t border-zinc-800/80 px-6 py-4">
          <a
            href={GITHUB_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Release notes on GitHub
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </Modal>
  )
}

export function WhatsNewTrigger() {
  const [open, setOpen] = useState(() => !hasSeenChangelog())

  const handleClose = () => {
    markChangelogSeen()
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-zinc-700/80 bg-zinc-900/60 px-2.5 py-1 font-mono text-[10px] font-medium tracking-wide text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
      >
        What&apos;s new
      </button>
      <ChangelogModal open={open} onClose={handleClose} />
    </>
  )
}
