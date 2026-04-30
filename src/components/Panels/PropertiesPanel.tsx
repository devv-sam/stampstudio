import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { ChromePicker } from 'react-color'

import { useStampEditor } from '../../hooks/useStampEditor'
import { PerforationSlider } from '../UI/PerforationSlider'
import { useImageUploadFlow } from '../../hooks/useImageUploadFlow'
import type { ImageAsset } from '../../types/assets'

/** Original five neutrals plus four mid-steps for a fuller gradient row. */
const COLOR_PRESETS = [
  '#ffffff',
  '#f5f5f5',
  '#e5e5e5',
  '#d4d4d4',
  '#a3a3a3',
  '#737373',
  '#262626',
  '#404040',
  '#0a0a0a',
] as const

const PRESET_HEX = new Set(
  COLOR_PRESETS.map((c) => c.toLowerCase()),
)

const LIGHT_SWATCH = new Set([
  '#ffffff',
  '#f5f5f5',
  '#e5e5e5',
  '#d4d4d4',
  '#a3a3a3',
])

export function PropertiesPanel() {
  const {
    perforationCount,
    setPerforationCount,
    stampColor,
    pickSolidStampColor,
    imageAssets,
    backgroundAsset,
    setAssetRole,
    removeAsset,
    clearBackground,
  } = useStampEditor()

  const bgUpload = useImageUploadFlow()

  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const [fillTab, setFillTab] = useState<'solid' | 'image'>('solid')
  const fillKind: 'solid' | 'image' = backgroundAsset ? 'image' : fillTab

  const onPickPreset = (color: string) => {
    void pickSolidStampColor(color)
    setFillTab('solid')
    setPickerOpen(false)
  }

  const onSolidTab = () => {
    if (backgroundAsset) void pickSolidStampColor(stampColor)
    setFillTab('solid')
    setPickerOpen(false)
  }

  const onImageTab = () => {
    setFillTab('image')
  }

  const handleClearBg = () => {
    void clearBackground()
    setFillTab('solid')
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <p className="text-sm font-medium text-zinc-300">Stamp</p>

        {/* Fill: Solid | Image toggle, then presets+picker or compact image — above perforation */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-zinc-400">Fill</span>
            <div
              className="inline-flex shrink-0 rounded-md border border-zinc-700/90 bg-zinc-900/50 p-0.5"
              role="group"
              aria-label="Fill type"
            >
              <FillTypeTab
                pressed={fillKind === 'solid'}
                onClick={onSolidTab}
                label="Solid"
                icon={<IconSolidSwatch />}
              />
              <FillTypeTab
                pressed={fillKind === 'image'}
                onClick={onImageTab}
                label="Image"
                icon={<IconImageFill />}
              />
            </div>
          </div>

          {fillKind === 'solid' ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {COLOR_PRESETS.map((color) => {
                const hex = color.toLowerCase()
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onPickPreset(color)}
                    title={color}
                    className="h-5 w-5 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{
                      background: color,
                      outline:
                        stampColor.toLowerCase() === hex
                          ? '2px solid white'
                          : '2px solid transparent',
                      outlineOffset: '1px',
                      boxShadow: LIGHT_SWATCH.has(hex)
                        ? 'inset 0 0 0 1px rgba(0,0,0,0.15)'
                        : undefined,
                    }}
                  />
                )
              })}

              <div className="relative shrink-0" ref={pickerRef}>
                <button
                  type="button"
                  onClick={() => setPickerOpen((o) => !o)}
                  title="Custom color"
                  className="h-5 w-5 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    background:
                      'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                    outline:
                      !PRESET_HEX.has(stampColor.toLowerCase()) && pickerOpen
                        ? '2px solid white'
                        : '2px solid transparent',
                    outlineOffset: '1px',
                  }}
                />
                {pickerOpen ? (
                  <div
                    className="absolute right-0 top-7 z-50"
                    onMouseLeave={() => setPickerOpen(false)}
                  >
                    <ChromePicker
                      color={stampColor}
                      onChange={(c) => {
                        void pickSolidStampColor(c.hex)
                        setFillTab('solid')
                      }}
                      disableAlpha
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : backgroundAsset ? (
            <div className="group flex w-full items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/40 px-2.5 py-1.5">
              <button
                type="button"
                onClick={bgUpload.open}
                title="Replace background image"
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25 rounded-md -m-0.5 p-0.5"
              >
                <img
                  src={backgroundAsset.src}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded object-cover"
                />
                <span
                  className="min-w-0 flex-1 truncate text-xs text-zinc-300"
                  title={
                    backgroundAsset.fileName ?? 'Background image'
                  }
                >
                  {backgroundAsset.fileName ?? 'Background image'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleClearBg}
                title="Remove background image"
                aria-label="Remove background image"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-zinc-100 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <IconDismiss />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={bgUpload.open}
              className="w-full rounded-lg border border-dashed border-zinc-700 bg-transparent px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900/40"
            >
              Upload image
            </button>
          )}

          {bgUpload.error ? (
            <p className="text-xs text-red-400">{bgUpload.error}</p>
          ) : null}
        </div>

        <PerforationSlider
          label="Perforation"
          defaultValue={perforationCount}
          minValue={0}
          maxValue={28}
          onChange={setPerforationCount}
        />

        {imageAssets.length > 0 ? (
          <AssetStrip
            assets={imageAssets}
            onPromoteBackground={(id) => setAssetRole(id, 'background')}
            onUnuse={(id) => setAssetRole(id, 'unused')}
            onDelete={(id) => removeAsset(id)}
          />
        ) : null}
      </section>

      {bgUpload.fileInputElement}
      {bgUpload.overlayElement}
    </div>
  )
}

function FillTypeTab({
  pressed,
  onClick,
  label,
  icon,
}: {
  pressed: boolean
  onClick: () => void
  label: string
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={pressed}
      onClick={onClick}
      title={label}
      className={`flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors ${
        pressed
          ? 'bg-zinc-700 text-zinc-100 shadow-sm'
          : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      <span className="flex shrink-0 items-center [&>svg]:block">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function IconSolidSwatch() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="currentColor"
      aria-hidden
    >
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" opacity={0.92} />
    </svg>
  )
}

function IconImageFill() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden
    >
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
      <circle cx="6" cy="6" r="1" fill="currentColor" stroke="none" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 11.5 5.5 9l2 1.5 2.5-2 3.5 2.5"
      />
    </svg>
  )
}

function IconDismiss() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  )
}

function AssetStrip({
  assets,
  onPromoteBackground,
  onUnuse,
  onDelete,
}: {
  assets: ImageAsset[]
  onPromoteBackground: (id: string) => void
  onUnuse: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [openMenu, setOpenMenu] = useState<{
    id: string
    anchor: HTMLButtonElement
  } | null>(null)

  const close = () => setOpenMenu(null)
  const openAsset = openMenu
    ? assets.find((a) => a.id === openMenu.id) ?? null
    : null

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Library ({assets.length})
      </p>
      <div className="grid grid-cols-5 gap-1.5">
        {assets.map((asset) => {
          const open = openMenu?.id === asset.id
          return (
            <button
              key={asset.id}
              type="button"
              onClick={(e) =>
                setOpenMenu(
                  open
                    ? null
                    : { id: asset.id, anchor: e.currentTarget },
                )
              }
              className={`relative aspect-square w-full overflow-hidden rounded-md border bg-zinc-900 transition-colors ${
                asset.role === 'background'
                  ? 'border-white/80'
                  : asset.role === 'unused'
                    ? 'border-zinc-800 hover:border-zinc-700'
                    : 'border-zinc-600'
              }`}
              title={asset.role}
            >
              <img
                src={asset.src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              {asset.role === 'background' ? (
                <span className="absolute bottom-0.5 right-0.5 rounded bg-white/90 px-1 text-[8px] font-bold uppercase tracking-wider text-zinc-950">
                  bg
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {openAsset && openMenu ? (
        <AssetMenuPopover
          anchor={openMenu.anchor}
          onClose={close}
          asset={openAsset}
          onPromoteBackground={onPromoteBackground}
          onUnuse={onUnuse}
          onDelete={onDelete}
        />
      ) : null}
    </div>
  )
}

function AssetMenuPopover({
  anchor,
  onClose,
  asset,
  onPromoteBackground,
  onUnuse,
  onDelete,
}: {
  anchor: HTMLElement
  onClose: () => void
  asset: ImageAsset
  onPromoteBackground: (id: string) => void
  onUnuse: (id: string) => void
  onDelete: (id: string) => void
}) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  )

  useLayoutEffect(() => {
    const reposition = () => {
      const popover = popoverRef.current
      if (!popover) return
      const a = anchor.getBoundingClientRect()
      const pw = popover.offsetWidth
      const ph = popover.offsetHeight
      const margin = 8

      let left = a.right - pw
      if (left < margin) left = a.left
      if (left + pw > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - pw - margin)
      }

      let top = a.bottom + 4
      if (top + ph > window.innerHeight - margin) {
        top = Math.max(margin, a.top - ph - 4)
      }

      setPosition({ left, top })
    }
    reposition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [anchor])

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      const popover = popoverRef.current
      if (!popover) return
      const target = e.target as Node | null
      if (!target) return
      if (popover.contains(target) || anchor.contains(target)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [anchor, onClose])

  const menu = (
    <div
      ref={popoverRef}
      role="menu"
      className="fixed z-[60] flex min-w-[160px] flex-col rounded-md border border-zinc-800 bg-[#141416] p-1 text-xs shadow-xl"
      style={{
        left: position?.left ?? -9999,
        top: position?.top ?? -9999,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      <MenuItem
        onClick={() => {
          onPromoteBackground(asset.id)
          onClose()
        }}
        disabled={asset.role === 'background'}
      >
        Use as background
      </MenuItem>
      {asset.role !== 'unused' ? (
        <MenuItem
          onClick={() => {
            onUnuse(asset.id)
            onClose()
          }}
        >
          Hide from stamp
        </MenuItem>
      ) : null}
      <div className="my-1 h-px bg-zinc-800" />
      <MenuItem
        onClick={() => {
          onDelete(asset.id)
          onClose()
        }}
        danger
      >
        Delete
      </MenuItem>
    </div>
  )

  return createPortal(menu, document.body)
}

function MenuItem({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-2 py-1.5 text-left transition-colors disabled:pointer-events-none disabled:opacity-40 ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-zinc-300 hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  )
}
