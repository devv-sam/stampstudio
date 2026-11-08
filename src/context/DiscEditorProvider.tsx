import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'

import { useStampEditor } from '../hooks/useStampEditor'
import { discSvg, NOISE_OPACITY, renderDisc } from '../utils/discExport'
import {
  FRAME_DEFAULT_SIZE,
  SLOT_DEFAULTS,
  SLOT_ORDER,
  type DiscFrameItem,
  type DiscTextItem,
} from '../utils/discText'
import { downloadDataUrl, downloadTextFile } from '../utils/exportHelpers'
import {
  DiscEditorContext,
  type DiscCrop,
  type DiscEditorContextValue,
} from './discEditorContext'

// svg wraps a raster body, this keeps it sharp without a huge file
const SVG_BODY_SIZE = 2048

/** Owns the CD designer. Shares the shader and the image library with the stamp editor. */
export function DiscEditorProvider({ children }: { children: ReactNode }) {
  const [discMode, setDiscMode] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [size, setSize] = useState(420)
  const [hole, setHole] = useState(20)
  const [rings, setRings] = useState(3)
  const [spread, setSpread] = useState(3)
  const [color, setColor] = useState('#3b84ee')
  const [image, setImage] = useState<string | null>(null)
  const [crop, setCrop] = useState<DiscCrop | null>(null)
  const [texts, setTexts] = useState<DiscTextItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const { activeShader, shaderParams, addImageAsset } = useStampEditor()
  const shaderOpacity =
    activeShader === 'image-dithering' &&
    shaderParams['image-dithering'].preset === 'noise'
      ? NOISE_OPACITY
      : 1

  const pickColor = useCallback((hex: string) => {
    setImage(null)
    setColor(hex)
  }, [])

  const startCrop = useCallback(
    (file: File) => setCrop({ kind: 'image', src: URL.createObjectURL(file) }),
    [],
  )

  // frames keep the original as a data url, so they can be recropped later
  const startFrameCrop = useCallback(async (file: File) => {
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    setCrop({ kind: 'frame', src, frameId: null })
  }, [])

  const closeCrop = useCallback(() => {
    setCrop((c) => {
      if (c?.src.startsWith('blob:')) URL.revokeObjectURL(c.src)
      return null
    })
  }, [])

  const [frames, setFrames] = useState<DiscFrameItem[]>([])

  const recropFrame = useCallback(
    (id: string) => {
      const frame = frames.find((f) => f.id === id)
      if (frame) setCrop({ kind: 'frame', src: frame.originalSrc, frameId: id })
    },
    [frames],
  )

  const applyCrop = useCallback(
    (src: string, width: number, height: number) => {
      if (!crop) return
      const aspect = width / height
      if (crop.kind === 'image') {
        setImage(src)
      } else if (crop.frameId) {
        const id = crop.frameId
        setFrames((all) => all.map((f) => (f.id === id ? { ...f, src, aspect } : f)))
        return
      } else {
        const id = crypto.randomUUID()
        const originalSrc = crop.src
        // lands on the center, where a label usually goes. it moves freely from there
        setFrames((all) => [
          ...all,
          { id, src, originalSrc, x: 50, y: 50, size: FRAME_DEFAULT_SIZE, rotation: 0, aspect },
        ])
        setSelectedId(id)
      }
      // library only, so it never replaces the stamp's background
      void addImageAsset({ src, width, height, role: 'unused' })
    },
    [crop, addImageAsset],
  )

  const renderPng = useCallback(
    async (size: number) => {
      const preview = previewRef.current
      if (!preview) throw new Error('Open the disc to export it')
      const canvas = await renderDisc(
        preview,
        { hole, rings, spread, color, image, texts, frames, shaderOpacity },
        size,
      )
      return canvas.toDataURL('image/png')
    },
    [hole, rings, spread, color, image, texts, frames, shaderOpacity],
  )

  const exportPng = useCallback(
    async (size: number) => downloadDataUrl(await renderPng(size), 'disc.png'),
    [renderPng],
  )

  const copyPng = useCallback(
    async (size: number) => {
      const blob = await (await fetch(await renderPng(size))).blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    },
    [renderPng],
  )

  const produceSvg = useCallback(
    async () => discSvg(await renderPng(SVG_BODY_SIZE), SVG_BODY_SIZE, hole),
    [renderPng, hole],
  )

  const exportSvg = useCallback(
    async () =>
      downloadTextFile(await produceSvg(), 'disc.svg', 'image/svg+xml;charset=utf-8'),
    [produceSvg],
  )

  const copySvg = useCallback(
    async () => navigator.clipboard.writeText(await produceSvg()),
    [produceSvg],
  )

  // straight slots fill first, then extras stack on the rim
  const addText = useCallback(() => {
    const id = crypto.randomUUID()
    setTexts((all) => {
      const taken = new Set(all.map((t) => t.slot))
      const slot = SLOT_ORDER.find((s) => !taken.has(s)) ?? 'rim'
      const defaults = SLOT_DEFAULTS[slot]
      return [
        ...all,
        {
          id,
          slot,
          content: defaults.content,
          angle: defaults.angle,
          fontSize: defaults.fontSize,
          fontFamily: 'Inter',
          fontWeight: slot === 'top' ? 600 : 500,
          color: '#ffffff',
        },
      ]
    })
    setSelectedId(id)
  }, [])

  const updateSelected = useCallback(
    (patch: Partial<DiscTextItem>) =>
      setTexts((all) =>
        all.map((t) => (t.id === selectedId ? { ...t, ...patch } : t)),
      ),
    [selectedId],
  )

  const removeSelected = useCallback(() => {
    setTexts((all) => all.filter((t) => t.id !== selectedId))
    setFrames((all) => all.filter((f) => f.id !== selectedId))
    setSelectedId(null)
  }, [selectedId])

  const value = useMemo<DiscEditorContextValue>(
    () => ({
      discMode,
      setDiscMode,
      previewing,
      setPreviewing,
      size,
      setSize,
      hole,
      setHole,
      rings,
      setRings,
      spread,
      setSpread,
      color,
      image,
      pickColor,
      setImage,
      crop,
      startCrop,
      startFrameCrop,
      recropFrame,
      closeCrop,
      applyCrop,
      texts,
      setTexts,
      selectedId,
      setSelectedId,
      addText,
      updateSelected,
      removeSelected,
      frames,
      setFrames,
      previewRef,
      exportPng,
      copyPng,
      exportSvg,
      copySvg,
    }),
    [
      discMode,
      previewing,
      size,
      hole,
      rings,
      spread,
      color,
      image,
      pickColor,
      crop,
      startCrop,
      startFrameCrop,
      recropFrame,
      closeCrop,
      applyCrop,
      texts,
      selectedId,
      addText,
      updateSelected,
      removeSelected,
      frames,
      exportPng,
      copyPng,
      exportSvg,
      copySvg,
    ],
  )

  return (
    <DiscEditorContext.Provider value={value}>
      {children}
    </DiscEditorContext.Provider>
  )
}
