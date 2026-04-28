import type { ReactNode } from 'react'

import { Modal } from '../UI/Modal'
import { Button } from '../UI/Button'

export function RoleStep({
  previewSrc,
  isProcessing,
  onBack,
  onPick,
  onCancel,
}: {
  previewSrc: string
  isProcessing: boolean
  onBack: () => void
  onPick: (role: 'background' | 'frame') => void
  onCancel: () => void
}) {
  return (
    <Modal open onClose={onCancel} labelledBy="role-step-title">
      <div className="flex flex-col">
        <header className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-3">
          <h2 id="role-step-title" className="text-sm font-medium text-zinc-200">
            Use this image as…
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3 p-5">
          <RoleCard
            title="Background"
            description="Fills the entire stamp body. Replaces the current solid color."
            previewSrc={previewSrc}
            disabled={isProcessing}
            onClick={() => onPick('background')}
            visualVariant="background"
          />
          <RoleCard
            title="Frame"
            description="A movable, resizable image element placed on the stamp."
            previewSrc={previewSrc}
            disabled={isProcessing}
            onClick={() => onPick('frame')}
            visualVariant="frame"
          />
        </div>

        <footer className="flex justify-between border-t border-zinc-800/80 px-5 py-3">
          <Button variant="ghost" onClick={onBack} disabled={isProcessing}>
            ← Back to crop
          </Button>
          <span className="text-xs text-zinc-500">
            You can change this later
          </span>
        </footer>
      </div>
    </Modal>
  )
}

function RoleCard({
  title,
  description,
  previewSrc,
  disabled,
  onClick,
  visualVariant,
}: {
  title: ReactNode
  description: ReactNode
  previewSrc: string
  disabled: boolean
  onClick: () => void
  visualVariant: 'background' | 'frame'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900/80 disabled:pointer-events-none disabled:opacity-50"
    >
      <div className="relative aspect-[7/5] w-full overflow-hidden rounded-md bg-[#141416]">
        {visualVariant === 'background' ? (
          <img
            src={previewSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-zinc-200" />
            <img
              src={previewSrc}
              alt=""
              className="absolute left-1/2 top-1/2 h-[55%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-sm object-cover shadow-md"
            />
          </>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-100">{title}</span>
        <span className="text-xs text-zinc-500">{description}</span>
      </div>
    </button>
  )
}
