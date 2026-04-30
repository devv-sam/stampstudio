import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

import { Modal } from '../UI/Modal'
import { Button } from '../UI/Button'
import { cropImageToDataUrl } from '../../utils/imageHelpers'

export type AspectChoice = {
  id: string
  label: string
  /** undefined = free-form (no constraint). */
  value: number | undefined
}

const ASPECT_CHOICES: AspectChoice[] = [
  { id: 'free', label: 'Free', value: undefined },
  { id: 'stamp', label: 'Match stamp', value: 420 / 300 },
  { id: 'square', label: '1:1', value: 1 },
  { id: 'wide', label: '16:9', value: 16 / 9 },
]

export function CropStep({
  src,
  onCancel,
  onConfirm,
  confirmDisabled = false,
  confirmLabel = 'Continue',
}: {
  src: string
  onCancel: () => void
  onConfirm: (dataUrl: string, width: number, height: number) => void
  /** Combined with cropping state — e.g. while parent persists the asset */
  confirmDisabled?: boolean
  confirmLabel?: string
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState<AspectChoice>(ASPECT_CHOICES[1])
  const [pixelArea, setPixelArea] = useState<Area | null>(null)
  const [isCropping, setIsCropping] = useState(false)

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setPixelArea(areaPixels)
  }, [])

  const onApply = async () => {
    if (!pixelArea) return
    setIsCropping(true)
    try {
      const result = await cropImageToDataUrl(src, pixelArea)
      onConfirm(result.dataUrl, result.width, result.height)
    } finally {
      setIsCropping(false)
    }
  }

  return (
    <Modal open onClose={onCancel} labelledBy="crop-step-title">
      <div className="flex flex-col">
        <header className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-3">
          <h2 id="crop-step-title" className="text-sm font-medium text-zinc-200">
            Crop & adjust
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
        </header>

        <div className="relative h-[360px] w-full bg-[#0a0a0a]">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect.value}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-zinc-800/80 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs uppercase tracking-wider text-zinc-500">
              Aspect
            </span>
            <div className="flex flex-wrap gap-1">
              {ASPECT_CHOICES.map((choice) => {
                const active = aspect.id === choice.id
                return (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => setAspect(choice)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-white text-zinc-950'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {choice.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs uppercase tracking-wider text-zinc-500">
              Zoom
            </span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-white"
              aria-label="Zoom"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onApply}
              disabled={!pixelArea || isCropping || confirmDisabled}
            >
              {isCropping ? 'Cropping…' : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
