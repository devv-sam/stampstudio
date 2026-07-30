import { Layers, Sparkles } from 'lucide-react'

import { Modal } from '../UI/Modal'
import { useExperiments } from '../../hooks/useExperiments'
import type { ExperimentId } from '../../context/experimentsContext'

interface ExperimentCard {
  id: ExperimentId | null
  title: string
  blurb: string
  icon: typeof Layers
}

/**
 * The experiments chooser — a playground of fun things to do *with* stamps
 * you've already made. Only "Stampsheet" is live; the rest are placeholders so
 * the grid reads as a growing collection.
 */
const CARDS: ExperimentCard[] = [
  {
    id: 'stampsheet',
    title: 'Stampsheet',
    blurb: 'Arrange your stamps as draggable stickers, then export a live sheet.',
    icon: Layers,
  },
  {
    id: null,
    title: 'More soon',
    blurb: 'Additional experiments are on the way.',
    icon: Sparkles,
  },
  {
    id: null,
    title: 'More soon',
    blurb: 'Additional experiments are on the way.',
    icon: Sparkles,
  },
]

export function ExperimentsModal() {
  const { modalOpen, closeModal, launch } = useExperiments()

  return (
    <Modal open={modalOpen} onClose={closeModal} labelledBy="experiments-title">
      <div className="flex items-baseline justify-between border-b border-zinc-800/80 px-5 py-4">
        <h2
          id="experiments-title"
          className="text-sm font-medium tracking-tight text-white"
        >
          Experiments
        </h2>
        <p className="text-[11px] text-zinc-500">Do more with your stamps</p>
      </div>

      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
        {CARDS.map((card, i) => {
          const active = card.id !== null
          const Icon = card.icon
          return (
            <button
              key={`${card.title}-${i}`}
              type="button"
              disabled={!active}
              onClick={() => card.id && launch(card.id)}
              className={`group flex aspect-[4/3] flex-col justify-between rounded-lg border p-3.5 text-left transition-colors ${
                active
                  ? 'cursor-pointer border-zinc-700/80 bg-zinc-900/60 hover:border-zinc-500 hover:bg-zinc-800/70'
                  : 'cursor-not-allowed border-dashed border-zinc-800 bg-transparent opacity-50'
              }`}
            >
              <Icon
                size={18}
                className={active ? 'text-white' : 'text-zinc-500'}
                aria-hidden
              />
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-zinc-100">
                  {card.title}
                </span>
                <span className="text-[11px] leading-snug text-zinc-500">
                  {card.blurb}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
