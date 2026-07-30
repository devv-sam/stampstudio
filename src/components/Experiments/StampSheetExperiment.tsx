import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'

import { motion } from 'framer-motion'
import { ArrowLeft, Download, Plus, SlidersHorizontal } from 'lucide-react'

import { Sheet } from '../../vendor/stampstuff/index.js'
import { exportSheet } from '../../vendor/stampstuff/export.js'
import embedTemplate from '../../vendor/stampstuff/embed-template.html?raw'
import { useExperiments } from '../../hooks/useExperiments'
import {
  getStampLibrary,
  type StampLibraryEntry,
} from '../../utils/stampLibraryStorage'

const SHEET_BACKGROUND = '#0e0e0e'
const DRAG_MIME = 'application/x-stampsheet-src'

/** A few dashed "cut-out" outlines — pure decoration inviting the drag action. */
interface Cutout {
  left: number
  top: number
  width: number
  height: number
  rotation: number
}

function makeCutouts(): Cutout[] {
  const count = 3 + Math.floor(Math.random() * 2) // 3–4
  return Array.from({ length: count }, () => ({
    left: 8 + Math.random() * 74, // % — keep clear of the edges
    top: 10 + Math.random() * 55,
    width: 70 + Math.random() * 90, // px
    height: 70 + Math.random() * 90,
    rotation: -12 + Math.random() * 24,
  }))
}

export function StampSheetExperiment() {
  const { exit } = useExperiments()

  const hostRef = useRef<HTMLDivElement | null>(null)
  const sheetRef = useRef<Sheet | null>(null)
  const hudRef = useRef<HTMLDivElement | null>(null)

  const cutouts = useMemo(makeCutouts, [])
  // Library stamps + anything the user uploads this session, all draggable.
  const [library] = useState<StampLibraryEntry[]>(() => getStampLibrary())
  const [uploaded, setUploaded] = useState<StampLibraryEntry[]>([])
  const trayStamps = useMemo(
    () => [...uploaded, ...library],
    [uploaded, library],
  )

  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // ── Mount the WebGL sheet once, into the host div. ────────────────────────
  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const sheet = new Sheet(host, {
      background: SHEET_BACKGROUND,
      dragEnabled: true,
    })
    sheetRef.current = sheet

    // Keep the dimension HUD glued above the selected stamp, updated per frame
    // (imperative — no React re-render on every animation tick).
    sheet.onFrame = () => {
      const hud = hudRef.current
      const s = sheet.selected
      if (!hud) return
      if (!s) {
        hud.style.opacity = '0'
        return
      }
      const rect = sheet.canvas.getBoundingClientRect()
      const nx = s._ax / sheet.width + 0.5
      const ny = 0.5 - s._ay / sheet.height
      const halfH = (s.baseHeight * s._as) / 2
      const w = Math.round(s.baseWidth * s.config.scale * s.config.baseScale)
      const h = Math.round(s.baseHeight * s.config.scale * s.config.baseScale)
      hud.textContent = `${w} × ${h}`
      hud.style.left = `${nx * rect.width}px`
      hud.style.top = `${ny * rect.height - halfH - 10}px`
      hud.style.opacity = '1'
    }

    return () => {
      sheet.destroy()
      sheetRef.current = null
    }
  }, [])

  // ── Drag a tray stamp onto the sheet → add it where it was dropped. ────────
  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    const src = e.dataTransfer.getData(DRAG_MIME)
    const sheet = sheetRef.current
    if (!src || !sheet) return
    const { x, y } = sheet.toWorld(e.clientX, e.clientY)
    void sheet.addStamp({ src, x, y })
  }, [])

  // ── "+" upload: read an external PNG/JPG, add to the tray + the sheet. ─────
  const onUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const src = String(reader.result)
      const img = new Image()
      img.onload = () => {
        setUploaded((prev) => [
          {
            id: `upload-${Date.now()}`,
            src,
            width: img.naturalWidth,
            height: img.naturalHeight,
            createdAt: Date.now(),
          },
          ...prev,
        ])
        void sheetRef.current?.addStamp({ src, x: 0, y: 0 })
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  }, [])

  const onDownload = useCallback(async () => {
    const sheet = sheetRef.current
    if (!sheet || busy) return
    setBusy(true)
    setBanner(null)
    try {
      await exportSheet(sheet, {
        template: embedTemplate,
        runtimeUrl: '/stampstuff/stampsheet.js',
        title: 'stampsheet',
        filename: 'stampsheet.html',
      })
    } catch (err) {
      setBanner(
        err instanceof Error ? err.message : 'Export failed — try again',
      )
    } finally {
      setBusy(false)
    }
  }, [busy])

  useEffect(() => {
    if (!banner) return
    const t = window.setTimeout(() => setBanner(null), 4200)
    return () => window.clearTimeout(t)
  }, [banner])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-[#0b0b0c]"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Sheet canvas region */}
      <div className="relative flex min-h-0 flex-1 items-stretch justify-center p-6 sm:p-10">
        <div
          ref={hostRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="relative h-full w-full max-w-5xl overflow-hidden rounded-sm border border-zinc-800/70"
          style={{ background: SHEET_BACKGROUND }}
        >
          {/* Decorative dashed cut-outs (behind the transparent WebGL canvas). */}
          {cutouts.map((c, i) => (
            <div
              key={i}
              aria-hidden
              className="pointer-events-none absolute rounded-[2px] border border-dashed border-zinc-700/55"
              style={{
                left: `${c.left}%`,
                top: `${c.top}%`,
                width: c.width,
                height: c.height,
                transform: `rotate(${c.rotation}deg)`,
              }}
            />
          ))}

          {/* Selected-stamp dimension read-out, tracks the stamp each frame. */}
          <div
            ref={hudRef}
            aria-hidden
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full font-mono text-[10px] tracking-wide text-zinc-400 opacity-0"
            style={{ left: 0, top: 0 }}
          />
        </div>
      </div>

      {/* Stamp tray */}
      <div className="flex shrink-0 items-center justify-center gap-2 px-6 pb-2">
        {trayStamps.map((stamp) => (
          <div
            key={stamp.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_MIME, stamp.src)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            title="Drag onto the sheet"
            className="flex h-12 w-12 cursor-grab items-center justify-center overflow-hidden rounded-md border border-zinc-800 bg-zinc-900/70 active:cursor-grabbing"
          >
            <img
              src={stamp.src}
              alt=""
              draggable={false}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Upload an image"
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-md border border-dashed border-zinc-700 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
        >
          <Plus size={16} aria-hidden />
          <span className="sr-only">Upload an image</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={onUpload}
          className="hidden"
        />
      </div>

      {banner ? (
        <div
          role="status"
          className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300"
        >
          {banner}
        </div>
      ) : null}

      {/* Bottom action bar (reuses the studio's floating-pill look). */}
      <div className="flex shrink-0 items-center justify-center pb-8 pt-2">
        <div className="flex items-center gap-1 rounded-md border border-zinc-700/90 bg-zinc-900/95 px-2 py-1.5">
          <button
            type="button"
            onClick={exit}
            title="Back to studio"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft size={14} aria-hidden />
            <span className="sr-only">Back to studio</span>
          </button>
          <button
            type="button"
            disabled
            title="Settings — coming soon"
            className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md text-zinc-600"
          >
            <SlidersHorizontal size={14} aria-hidden />
            <span className="sr-only">Settings (coming soon)</span>
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={busy}
            title="Export sheet as HTML"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} aria-hidden />
            <span className="sr-only">Export sheet as HTML</span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
