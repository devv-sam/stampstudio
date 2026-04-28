import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'

import {
  StampEditorContext,
  type StampDimensions,
} from './stampEditorContext'
import type { StampCanvasApi } from '../types/canvas'
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

  const register = useCallback((api: StampCanvasApi) => {
    detachRef.current?.()
    apiRef.current = api

    const syncDimensions = () => {
      setStampDimensions({
        width: Math.round(api.stamp.getScaledWidth()),
        height: Math.round(api.stamp.getScaledHeight()),
      })
    }

    syncDimensions()
    api.stamp.on('modified', syncDimensions)
    api.stamp.on('scaling', syncDimensions)
    api.stamp.on('moving', syncDimensions)

    detachRef.current = () => {
      api.stamp.off('modified', syncDimensions)
      api.stamp.off('scaling', syncDimensions)
      api.stamp.off('moving', syncDimensions)
    }
  }, [])

  const unregister = useCallback(() => {
    detachRef.current?.()
    detachRef.current = null
    apiRef.current = null
  }, [])

  const exportPng = useCallback((multiplier = 2) => {
    const api = apiRef.current
    if (!api) return
    const dataUrl = exportStampPng(api.canvas, api.stamp, multiplier)
    downloadDataUrl(dataUrl, 'stamp.png')
  }, [])

  const exportJpeg = useCallback(
    (options?: { multiplier?: number; quality?: number }) => {
      const api = apiRef.current
      if (!api) return
      const dataUrl = exportStampJpeg(api.canvas, api.stamp, options)
      downloadDataUrl(dataUrl, 'stamp.jpg')
    },
    [],
  )

  const exportSvg = useCallback(() => {
    const api = apiRef.current
    if (!api) return
    const svg = exportStampSvg(api.canvas, api.stamp)
    downloadTextFile(svg, 'stamp.svg', 'image/svg+xml;charset=utf-8')
  }, [])

  const value = useMemo(
    () => ({
      register,
      unregister,
      stampDimensions,
      exportPng,
      exportJpeg,
      exportSvg,
    }),
    [exportJpeg, exportPng, exportSvg, register, unregister, stampDimensions],
  )

  return (
    <StampEditorContext.Provider value={value}>
      {children}
    </StampEditorContext.Provider>
  )
}
