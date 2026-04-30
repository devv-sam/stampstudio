import { useCallback, useRef, useState } from 'react'

import { CropStep } from '../components/Upload/CropStep'
import { readFileAsDataUrl } from '../utils/imageHelpers'
import { useStampEditor } from './useStampEditor'

/**
 * Background image upload flow:
 *
 * trigger → file picker → crop modal → apply as stamp background immediately
 *
 * Returns the trigger handler plus `fileInputElement` and `overlayElement`
 * (crop modal only). No role-picker step — avoids repeated modals when users
 * upload many images.
 */
type Step = 'idle' | 'crop'

export function useImageUploadFlow() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('idle')
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const pendingFileNameRef = useRef<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const { addImageAsset } = useStampEditor()

  const open = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const reset = useCallback(() => {
    setStep('idle')
    setSourceUrl(null)
    pendingFileNameRef.current = null
    setError(null)
  }, [])

  const onFilePicked = useCallback(async (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    setError(null)
    try {
      pendingFileNameRef.current = file.name
      const dataUrl = await readFileAsDataUrl(file)
      setSourceUrl(dataUrl)
      setStep('crop')
    } catch {
      pendingFileNameRef.current = null
      setError("Couldn't read that file. Try a different one.")
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const onCropConfirmed = useCallback(
    async (dataUrl: string, width: number, height: number) => {
      setIsProcessing(true)
      try {
        const name = pendingFileNameRef.current
        await addImageAsset({
          src: dataUrl,
          width,
          height,
          role: 'background',
          ...(name ? { fileName: name } : {}),
        })
        reset()
      } finally {
        setIsProcessing(false)
      }
    },
    [addImageAsset, reset],
  )

  const fileInputElement = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
    />
  )

  const overlayElement =
    step === 'crop' && sourceUrl ? (
      <CropStep
        src={sourceUrl}
        onCancel={reset}
        onConfirm={(dataUrl, w, h) => {
          void onCropConfirmed(dataUrl, w, h)
        }}
        confirmDisabled={isProcessing}
        confirmLabel={isProcessing ? 'Applying…' : 'Apply background'}
      />
    ) : null

  return { open, error, fileInputElement, overlayElement }
}
