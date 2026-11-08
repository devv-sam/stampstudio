import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { SLOT_DEFAULTS, SLOT_ORDER, type DiscTextItem } from '../utils/discText'
import { DiscEditorContext, type DiscEditorContextValue } from './discEditorContext'

/** Owns the CD designer. Kept apart from the stamp editor so neither knows about the other. */
export function DiscEditorProvider({ children }: { children: ReactNode }) {
  const [discMode, setDiscMode] = useState(false)
  const [size, setSize] = useState(420)
  const [hole, setHole] = useState(20)
  const [rings, setRings] = useState(3)
  const [spread, setSpread] = useState(3)
  const [color, setColor] = useState('#3b84ee')
  const [image, setImage] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [texts, setTexts] = useState<DiscTextItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const pickColor = useCallback((hex: string) => {
    setImage(null)
    setColor(hex)
  }, [])

  const startCrop = useCallback(
    (file: File) => setCropSrc(URL.createObjectURL(file)),
    [],
  )

  const closeCrop = useCallback(() => {
    setCropSrc((src) => {
      if (src) URL.revokeObjectURL(src)
      return null
    })
  }, [])

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
    setSelectedId(null)
  }, [selectedId])

  const value = useMemo<DiscEditorContextValue>(
    () => ({
      discMode,
      setDiscMode,
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
      cropSrc,
      startCrop,
      closeCrop,
      texts,
      setTexts,
      selectedId,
      setSelectedId,
      addText,
      updateSelected,
      removeSelected,
    }),
    [
      discMode,
      size,
      hole,
      rings,
      spread,
      color,
      image,
      pickColor,
      cropSrc,
      startCrop,
      closeCrop,
      texts,
      selectedId,
      addText,
      updateSelected,
      removeSelected,
    ],
  )

  return (
    <DiscEditorContext.Provider value={value}>
      {children}
    </DiscEditorContext.Provider>
  )
}
