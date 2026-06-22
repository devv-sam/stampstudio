import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import grassImg from '../../assets/grass.jpg'
import {
  CHANGELOG,
  type ChangelogEntry,
  type ChangelogFeature,
} from '../../data/changelog'
import { hasSeenChangelog, markChangelogSeen } from '../../utils/changelogStorage'
import { ChangelogStampShell } from './ChangelogStampShell'
import { Modal } from './Modal'

function ChangelogHero({
  entry,
  compact = false,
}: {
  entry: ChangelogEntry
  compact?: boolean
}) {
  return (
    <div
      className={`relative overflow-hidden bg-zinc-900 ${
        compact ? 'px-4 py-5' : 'px-6 py-8'
      }`}
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.62)), url(${grassImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <p
        className={`font-display lowercase tracking-tight text-white ${
          compact ? 'text-lg' : 'text-2xl'
        }`}
      >
        stampstudio
      </p>
      <p className={`mt-0.5 text-zinc-200/80 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {entry.heroSubtitle}
      </p>
    </div>
  )
}

function FeatureBlock({
  feature,
  compact = false,
}: {
  feature: ChangelogFeature
  compact?: boolean
}) {
  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
      <p
        className={`font-display leading-snug text-zinc-900 ${
          compact ? 'text-[11px]' : 'text-sm'
        }`}
      >
        {feature.name}
      </p>
      <p
        className={`leading-relaxed text-zinc-600 ${
          compact ? 'text-[10px]' : 'text-xs'
        }`}
      >
        {feature.description}
      </p>
    </div>
  )
}

function FeatureList({
  features,
  compact = false,
}: {
  features: ChangelogFeature[]
  compact?: boolean
}) {
  return (
    <ul
      className={
        compact
          ? 'flex flex-col gap-3'
          : 'grid grid-cols-1 gap-4 sm:grid-cols-2'
      }
    >
      {features.map((feature) => (
        <li key={feature.name}>
          <FeatureBlock feature={feature} compact={compact} />
        </li>
      ))}
    </ul>
  )
}

function ChangelogBody({
  entry,
  compact = false,
}: {
  entry: ChangelogEntry
  compact?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const extra = entry.details ?? []
  const visibleFeatures = expanded
    ? [...entry.features, ...extra]
    : entry.features

  return (
    <div className={`flex flex-col ${compact ? 'gap-2.5 p-3.5' : 'gap-5 p-5'}`}>
      {!compact ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-sm border border-zinc-900/15 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#fbfaf5]">
            v{entry.version}
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            {entry.date}
          </span>
        </div>
      ) : null}

      <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
        <h2
          id={compact ? 'changelog-title-compact' : 'changelog-title'}
          className={`font-display lowercase leading-tight text-zinc-900 ${
            compact ? 'text-[15px]' : 'text-lg'
          }`}
        >
          {compact ? entry.compactTitle : entry.title}
        </h2>
        {compact && entry.teaser ? (
          <p className="text-xs leading-relaxed text-zinc-600">{entry.teaser}</p>
        ) : null}
      </div>

      {compact && entry.compactNotes.length > 0 ? (
        <ul className="space-y-2 border-t border-dotted border-zinc-300/80 pt-2.5">
          {entry.compactNotes.slice(0, 2).map((note) => (
            <li key={note.name}>
              <p className="font-display text-[11px] leading-snug text-zinc-900">
                {note.name}
              </p>
              <p className="text-[10px] leading-relaxed text-zinc-500">
                {note.description}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {!compact ? (
        <FeatureList features={visibleFeatures} />
      ) : null}

      {!compact && extra.length > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex w-fit rounded-sm border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
        >
          {expanded ? 'Show less' : 'View all updates'}
        </button>
      ) : null}
    </div>
  )
}

function CloseButton({
  onClick,
  light = false,
}: {
  onClick: () => void
  light?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={`absolute right-2 top-2 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-colors ${
        light
          ? 'bg-black/30 text-white/90 hover:bg-black/45 hover:text-white'
          : 'border border-zinc-300/80 bg-white/90 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900'
      }`}
    >
      <X className="h-3.5 w-3.5" />
    </button>
  )
}

function ChangelogCompactPopup({
  open,
  onClose,
  onOpenFull,
  instantExit = false,
}: {
  open: boolean
  onClose: () => void
  onOpenFull: () => void
  instantExit?: boolean
}) {
  const entry = CHANGELOG[0]

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!entry) return null

  const width = 253
  const height = 308

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="changelog-compact"
          role="dialog"
          aria-modal="false"
          aria-labelledby="changelog-title-compact"
          className="pointer-events-auto fixed bottom-[5.75rem] left-4 z-50"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={
            instantExit
              ? { opacity: 0, transition: { duration: 0 } }
              : { opacity: 0, y: 20, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }
          }
          transition={{
            delay: 0.45,
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <ChangelogStampShell
            width={width}
            height={height}
            density={10}
            matClassName="bg-[#141416]"
          >
            <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
              <CloseButton onClick={onClose} light />
              <ChangelogHero entry={entry} compact />
              <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <ChangelogBody entry={entry} compact />
              </div>
              <div className="shrink-0 border-t border-dotted border-zinc-300/80 bg-[#fbfaf5] px-3.5 py-2.5">
                <button
                  type="button"
                  onClick={onOpenFull}
                  className="w-full cursor-pointer rounded-sm bg-zinc-900 px-2.5 py-2 text-[11px] font-medium tracking-wide text-[#fbfaf5] transition-colors hover:bg-zinc-800"
                >
                  See everything
                </button>
              </div>
            </div>
          </ChangelogStampShell>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function ChangelogModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const entry = CHANGELOG[0]
  if (!entry) return null

  const width = 400
  const height = 520

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="changelog-title"
      animatePanel={false}
      panelClassName="!w-auto !max-w-none items-center justify-center overflow-visible border-0 bg-transparent p-0 shadow-none"
    >
      <ChangelogStampShell
        width={width}
        height={height}
        density={14}
        matClassName="bg-[#101010]"
      >
        <div className="relative flex h-full flex-col">
          <CloseButton onClick={onClose} />
          <ChangelogHero entry={entry} />
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ChangelogBody entry={entry} />
          </div>
        </div>
      </ChangelogStampShell>
    </Modal>
  )
}

export function WhatsNewTrigger() {
  const [compactOpen, setCompactOpen] = useState(() => !hasSeenChangelog())
  const [fullOpen, setFullOpen] = useState(false)
  const [instantCompactExit, setInstantCompactExit] = useState(false)

  const dismissCompact = () => {
    setInstantCompactExit(false)
    markChangelogSeen()
    setCompactOpen(false)
  }

  const openFull = () => {
    setInstantCompactExit(true)
    setCompactOpen(false)
    markChangelogSeen()
    setFullOpen(true)
  }

  const openFullFromHeader = () => {
    setInstantCompactExit(true)
    setCompactOpen(false)
    setFullOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={openFullFromHeader}
        className="cursor-pointer rounded-full border border-zinc-700/80 bg-zinc-900/60 px-2.5 py-1 font-mono text-[10px] font-medium tracking-wide text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
      >
        What&apos;s new
      </button>
      <ChangelogCompactPopup
        open={compactOpen && !fullOpen}
        onClose={dismissCompact}
        onOpenFull={openFull}
        instantExit={instantCompactExit}
      />
      <ChangelogModal open={fullOpen} onClose={() => setFullOpen(false)} />
    </>
  )
}
