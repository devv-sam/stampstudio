import { useCallback, useRef, useState } from 'react'

import { CropStep } from '../components/Upload/CropStep'
import type { ImageAsset } from '../types/assets'
import { readFileAsDataUrl } from '../utils/imageHelpers'
import { useStampEditor } from './useStampEditor'

/**
 * Image upload flow used for both background images and frame images:
 *
 *   trigger → file picker → crop modal → add asset in the chosen role
 *
 * The role can be set per-instance (`defaultRole`) and overridden per
 * `open()` call so the same hook powers both the sidebar's bg upload and
 * the floating bar's frame upload without any duplicated logic.
 *
 * Recrops always preserve the asset's existing role (frame/bg/unused).
 */
type UploadRole = 'background' | 'frame'

/**
 * What the in-flight upload is doing — used both to drive the modal label
 * and to choose the right write op (`addImageAsset` vs `updateImageAsset`)
 * when the crop is confirmed. Lives in state so render-time reads are safe.
 */
type PendingAction =
  | { kind: 'fresh'; role: UploadRole }
  | { kind: 'recrop'; assetId: string }

type ImageUploadFlowOptions = {
  /** Role applied to fresh uploads when `open()` is called without an override. */
  defaultRole?: UploadRole
}

export function useImageUploadFlow(options?: ImageUploadFlowOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const pendingFileNameRef = useRef<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const { addImageAsset, updateImageAsset } = useStampEditor()

  const open = useCallback(
    (roleOverride?: UploadRole) => {
      const role = roleOverride ?? options?.defaultRole ?? 'background'
      setPendingAction({ kind: 'fresh', role })
      fileInputRef.current?.click()
    },
    [options?.defaultRole],
  )

  const openRecrop = useCallback((asset: ImageAsset) => {
    pendingFileNameRef.current = asset.fileName ?? null
    setPendingAction({ kind: 'recrop', assetId: asset.id })
    // Always recrop from original source when available to avoid crop compounding.
    setSourceUrl(asset.originalSrc ?? asset.src)
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setSourceUrl(null)
    setPendingAction(null)
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
    } catch {
      pendingFileNameRef.current = null
      setError("Couldn't read that file. Try a different one.")
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const onCropConfirmed = useCallback(
    async (dataUrl: string, width: number, height: number) => {
      if (!pendingAction) return
      setIsProcessing(true)
      try {
        const name = pendingFileNameRef.current
        if (pendingAction.kind === 'recrop') {
          await updateImageAsset(pendingAction.assetId, {
            src: dataUrl,
            width,
            height,
            ...(name ? { fileName: name } : {}),
            ...(sourceUrl ? { originalSrc: sourceUrl } : {}),
          })
        } else {
          await addImageAsset({
            src: dataUrl,
            width,
            height,
            role: pendingAction.role,
            ...(name ? { fileName: name } : {}),
            ...(sourceUrl ? { originalSrc: sourceUrl } : {}),
          })
        }
        reset()
      } finally {
        setIsProcessing(false)
      }
    },
    [addImageAsset, pendingAction, reset, sourceUrl, updateImageAsset],
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

  /**
   * Confirm-button copy mirrors the upload's intent so the modal reads
   * the same regardless of which entry point opened it.
   */
  const idleConfirmLabel =
    pendingAction?.kind === 'recrop'
      ? 'Apply changes'
      : pendingAction?.role === 'frame'
        ? 'Add frame'
        : 'Apply background'
  const processingConfirmLabel =
    pendingAction?.kind === 'recrop'
      ? 'Applying…'
      : pendingAction?.role === 'frame'
        ? 'Adding…'
        : 'Applying…'

  const overlayElement =
    sourceUrl && pendingAction ? (
      <CropStep
        src={sourceUrl}
        onCancel={reset}
        onConfirm={(dataUrl, w, h) => {
          void onCropConfirmed(dataUrl, w, h)
        }}
        confirmDisabled={isProcessing}
        confirmLabel={isProcessing ? processingConfirmLabel : idleConfirmLabel}
      />
    ) : null

  return { open, openRecrop, error, fileInputElement, overlayElement }
}
