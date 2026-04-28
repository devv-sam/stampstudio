import { useCallback, useRef, useState } from 'react'

import { CropStep } from '../components/Upload/CropStep'
import { RoleStep } from '../components/Upload/RoleStep'
import { readFileAsDataUrl } from '../utils/imageHelpers'
import { useStampEditor } from './useStampEditor'

/**
 * Drives the full upload flow:
 *
 *   trigger → file picker → crop modal → role chooser → asset added
 *
 * Returns the trigger handler plus two render slots — `fileInputElement`
 * (the hidden <input>) and `overlayElement` (the modals). The host panel
 * mounts both once and wires `open()` to its own button.
 *
 * Keeping all flow state inside this hook means the panel UI stays
 * declarative: it doesn't manage the cropper, doesn't know about role
 * selection, and never sees the raw File / data URL plumbing.
 */
type Step = 'idle' | 'crop' | 'role'

export function useImageUploadFlow() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('idle')
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null)
  const [croppedSize, setCroppedSize] = useState<{ w: number; h: number }>({
    w: 1,
    h: 1,
  })
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const { addImageAsset } = useStampEditor()

  const open = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const onFilePicked = useCallback(async (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    setError(null)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setSourceUrl(dataUrl)
      setStep('crop')
    } catch {
      setError("Couldn't read that file. Try a different one.")
    }
    // Allow picking the same file again later.
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const reset = useCallback(() => {
    setStep('idle')
    setSourceUrl(null)
    setCroppedUrl(null)
    setError(null)
  }, [])

  const onCropConfirmed = useCallback(
    (dataUrl: string, w: number, h: number) => {
      setCroppedUrl(dataUrl)
      setCroppedSize({ w, h })
      setStep('role')
    },
    [],
  )

  const onRolePicked = useCallback(
    async (role: 'background' | 'frame') => {
      if (!croppedUrl) return
      setIsProcessing(true)
      try {
        await addImageAsset({
          src: croppedUrl,
          width: croppedSize.w,
          height: croppedSize.h,
          role,
        })
        reset()
      } finally {
        setIsProcessing(false)
      }
    },
    [croppedUrl, croppedSize, addImageAsset, reset],
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

  const overlayElement = (
    <>
      {step === 'crop' && sourceUrl ? (
        <CropStep
          src={sourceUrl}
          onCancel={reset}
          onConfirm={onCropConfirmed}
        />
      ) : null}
      {step === 'role' && croppedUrl ? (
        <RoleStep
          previewSrc={croppedUrl}
          isProcessing={isProcessing}
          onBack={() => setStep('crop')}
          onPick={onRolePicked}
          onCancel={reset}
        />
      ) : null}
    </>
  )

  return { open, error, fileInputElement, overlayElement }
}
