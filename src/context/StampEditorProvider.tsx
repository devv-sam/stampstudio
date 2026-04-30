import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  StampEditorContext,
  type StampDimensions,
} from './stampEditorContext'
import type { StampCanvasApi } from '../types/canvas'
import type { ImageAsset } from '../types/assets'
import { getStampBgRect } from '../utils/fabricHelpers'
import { shortId } from '../utils/imageHelpers'
import {
  addFrameImage,
  applyStampBackground,
  removeAllFrames,
  removeFrameByAssetId,
} from '../utils/stampImageHelpers'
import {
  downloadDataUrl,
  downloadTextFile,
  exportStampJpeg,
  exportStampPng,
  exportStampSvg,
} from '../utils/exportHelpers'

export type { StampDimensions }

export function StampEditorProvider({ children }: { children: ReactNode }) {
  const apiRef = useRef<StampCanvasApi | null>(null)
  const detachRef = useRef<(() => void) | null>(null)

  const [stampDimensions, setStampDimensions] = useState<StampDimensions>({
    width: 420,
    height: 300,
  })
  const [perforationCount, setPerforationCount] = useState(14)
  const [stampColor, _setStampColor] = useState('#ffffff')
  const [imageAssets, setImageAssets] = useState<ImageAsset[]>([])
  /**
   * Bumped whenever the Fabric canvas (re-)registers so reconciliation
   * effects re-run against the fresh canvas instance — covers HMR remounts
   * and viewport resizes that recreate the canvas.
   */
  const [canvasEpoch, setCanvasEpoch] = useState(0)

  /**
   * Latest stampColor, mirrored into a ref so async Fabric callbacks
   * (e.g. clearBackground, called from an event handler) can read the
   * current value without re-binding.
   */
  const stampColorRef = useRef(stampColor)
  useEffect(() => {
    stampColorRef.current = stampColor
  }, [stampColor])

  const backgroundAsset = useMemo(
    () => imageAssets.find((a) => a.role === 'background') ?? null,
    [imageAssets],
  )
  const frameAssets = useMemo(
    () => imageAssets.filter((a) => a.role === 'frame'),
    [imageAssets],
  )
  const hasBackground = backgroundAsset !== null

  // ────────────────────────────────────────────────────────────────────────
  // Stamp color
  // ────────────────────────────────────────────────────────────────────────

  const setStampColor = useCallback(
    (color: string) => {
      _setStampColor(color)
      const api = apiRef.current
      if (!api) return
      // While an image background is active the rect's `fill` is a Pattern;
      // changing the underlying color should NOT clobber that. The color
      // becomes effective again only after the background is cleared.
      if (hasBackground) return
      const bgRect = getStampBgRect(api.stamp)
      bgRect?.set({ fill: color })
      api.canvas.requestRenderAll()
    },
    [hasBackground],
  )

  const pickSolidStampColor = useCallback(async (color: string) => {
    setImageAssets((prev) =>
      prev.map((a) => (a.role === 'background' ? { ...a, role: 'unused' } : a)),
    )
    _setStampColor(color)
    stampColorRef.current = color
    const api = apiRef.current
    if (!api) return
    await applyStampBackground(api.canvas, api.stamp, null, color)
  }, [])

  // ────────────────────────────────────────────────────────────────────────
  // Canvas registration — wires Fabric events into provider state
  // ────────────────────────────────────────────────────────────────────────

  /** Track which frame asset ids are currently mounted on the canvas. */
  const mountedFrameIdsRef = useRef<Set<string>>(new Set())

  const register = useCallback((api: StampCanvasApi) => {
    detachRef.current?.()
    apiRef.current = api
    // Fresh canvas → no frames mounted yet, regardless of what state thinks.
    mountedFrameIdsRef.current = new Set()
    setCanvasEpoch((n) => n + 1)

    const syncDimensions = () => {
      setStampDimensions({
        width: Math.round(api.stamp.getScaledWidth()),
        height: Math.round(api.stamp.getScaledHeight()),
      })
    }

    const onStampChange = () => {
      syncDimensions()
    }

    syncDimensions()
    api.stamp.on('modified', onStampChange)
    api.stamp.on('scaling', onStampChange)
    api.stamp.on('moving', onStampChange)

    detachRef.current = () => {
      api.stamp.off('modified', onStampChange)
      api.stamp.off('scaling', onStampChange)
      api.stamp.off('moving', onStampChange)
    }
  }, [])

  const unregister = useCallback(() => {
    detachRef.current?.()
    detachRef.current = null
    if (apiRef.current) {
      removeAllFrames(apiRef.current.canvas, apiRef.current.stamp)
    }
    apiRef.current = null
    mountedFrameIdsRef.current = new Set()
  }, [])

  // ────────────────────────────────────────────────────────────────────────
  // Image asset actions
  //
  // Roles are demoted/promoted on the React state side, then a small effect
  // below reconciles those changes onto the Fabric canvas. Keeping the
  // reconciliation centralised means add/remove/role-change all go through
  // the same code path and can't drift.
  // ────────────────────────────────────────────────────────────────────────

  const addImageAsset = useCallback(
    async ({
      src,
      width,
      height,
      role,
      fileName,
    }: {
      src: string
      width: number
      height: number
      role: 'background' | 'frame'
      fileName?: string
    }) => {
      setImageAssets((prev) => {
        const next: ImageAsset[] = prev.map((a) =>
          // Only one bg at a time — demote the previous one.
          role === 'background' && a.role === 'background'
            ? { ...a, role: 'unused' }
            : a,
        )
        next.push({
          id: shortId(),
          src,
          width,
          height,
          role,
          createdAt: new Date().toISOString(),
          ...(fileName ? { fileName } : {}),
        })
        return next
      })
    },
    [],
  )

  const setAssetRole = useCallback(
    async (id: string, role: ImageAsset['role']) => {
      setImageAssets((prev) =>
        prev.map((a) => {
          if (a.id === id) return { ...a, role }
          // Promoting another asset to background demotes the existing bg.
          if (role === 'background' && a.role === 'background')
            return { ...a, role: 'unused' }
          return a
        }),
      )
    },
    [],
  )

  const removeAsset = useCallback(async (id: string) => {
    setImageAssets((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const clearBackground = useCallback(async () => {
    setImageAssets((prev) =>
      prev.map((a) => (a.role === 'background' ? { ...a, role: 'unused' } : a)),
    )
  }, [])

  // ────────────────────────────────────────────────────────────────────────
  // Reconcile asset state → Fabric canvas (side effects)
  //
  // Background: rebuild the rect's Pattern fill whenever the bg asset's src
  //             changes; restore solid color when it becomes null.
  // Frames:     Fabric Image objects are created once per asset id and
  //             removed when the asset leaves the frame role. Existing frame
  //             objects are left alone so the user's positioning is
  //             preserved across re-renders.
  // ────────────────────────────────────────────────────────────────────────

  /** Memoise the bg src/id so the effect runs only on real changes. */
  const bgFingerprint = backgroundAsset
    ? `${backgroundAsset.id}:${backgroundAsset.src.length}`
    : null

  useEffect(() => {
    const api = apiRef.current
    if (!api) return
    let cancelled = false
    void (async () => {
      try {
        await applyStampBackground(
          api.canvas,
          api.stamp,
          backgroundAsset?.src ?? null,
          stampColorRef.current,
        )
      } catch (err) {
        if (!cancelled) {
          console.error('[stampstudio] background apply failed', err)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // bgFingerprint + canvasEpoch are the meaningful change signals here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgFingerprint, canvasEpoch])

  useEffect(() => {
    const api = apiRef.current
    if (!api) return

    const desired = new Set(frameAssets.map((a) => a.id))
    const mounted = mountedFrameIdsRef.current

    // Remove frames whose assets are gone or no longer have role === 'frame'.
    for (const id of mounted) {
      if (!desired.has(id)) {
        removeFrameByAssetId(api.canvas, api.stamp, id)
        mounted.delete(id)
      }
    }

    // Add frames for any new frame assets.
    let cancelled = false
    void (async () => {
      for (const asset of frameAssets) {
        if (cancelled) return
        if (mounted.has(asset.id)) continue
        try {
          await addFrameImage(api.canvas, api.stamp, asset.src, asset.id)
          mounted.add(asset.id)
        } catch (err) {
          console.error('[stampstudio] frame add failed', err)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [frameAssets, canvasEpoch])

  // ────────────────────────────────────────────────────────────────────────
  // Exports — async because we now rasterise the live Fabric region first
  // ────────────────────────────────────────────────────────────────────────

  const exportPng = useCallback(
    async (multiplier = 2) => {
      const api = apiRef.current
      if (!api) return
      const dataUrl = await exportStampPng(
        api.canvas,
        api.stamp,
        multiplier,
        perforationCount,
      )
      downloadDataUrl(dataUrl, 'stamp.png')
    },
    [perforationCount],
  )

  const exportJpeg = useCallback(
    async (options?: { multiplier?: number; quality?: number }) => {
      const api = apiRef.current
      if (!api) return
      const dataUrl = await exportStampJpeg(
        api.canvas,
        api.stamp,
        options,
        perforationCount,
      )
      downloadDataUrl(dataUrl, 'stamp.jpg')
    },
    [perforationCount],
  )

  const exportSvg = useCallback(async () => {
    const api = apiRef.current
    if (!api) return
    const svg = await exportStampSvg(api.canvas, api.stamp, perforationCount)
    downloadTextFile(svg, 'stamp.svg', 'image/svg+xml;charset=utf-8')
  }, [perforationCount])

  // ────────────────────────────────────────────────────────────────────────

  const value = useMemo(
    () => ({
      register,
      unregister,
      stampDimensions,
      perforationCount,
      setPerforationCount,
      stampColor,
      setStampColor,
      pickSolidStampColor,
      imageAssets,
      backgroundAsset,
      frameAssets,
      addImageAsset,
      setAssetRole,
      removeAsset,
      clearBackground,
      exportPng,
      exportJpeg,
      exportSvg,
    }),
    [
      register,
      unregister,
      stampDimensions,
      perforationCount,
      stampColor,
      setStampColor,
      pickSolidStampColor,
      imageAssets,
      backgroundAsset,
      frameAssets,
      addImageAsset,
      setAssetRole,
      removeAsset,
      clearBackground,
      exportPng,
      exportJpeg,
      exportSvg,
    ],
  )

  return (
    <StampEditorContext.Provider value={value}>
      {children}
    </StampEditorContext.Provider>
  )
}
