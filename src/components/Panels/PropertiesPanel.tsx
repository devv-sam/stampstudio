import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChromePicker } from 'react-color'

import { useStampEditor } from '../../hooks/useStampEditor'
import { PerforationSlider } from '../UI/PerforationSlider'
import { useImageUploadFlow } from '../../hooks/useImageUploadFlow'
import type { ImageAsset } from '../../types/assets'

const COLOR_PRESETS = ['#ffffff', '#d4d4d4', '#a3a3a3', '#404040', '#0a0a0a']

export function PropertiesPanel() {
  const {
    perforationCount,
    setPerforationCount,
    stampColor,
    setStampColor,
    imageAssets,
    backgroundAsset,
    setAssetRole,
    removeAsset,
    clearBackground,
  } = useStampEditor()

  const upload = useImageUploadFlow()

  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const colorPickerDisabled = backgroundAsset !== null

  return (
    <div className="space-y-6">
      {/* ── Source ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-sm font-medium text-zinc-300">Source</p>

        <button
          type="button"
          onClick={upload.open}
          className="w-full rounded-lg border border-dashed border-zinc-700 bg-transparent px-4 py-3 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-900/40"
        >
          Upload Image
        </button>

        {upload.error ? (
          <p className="text-xs text-red-400">{upload.error}</p>
        ) : null}

        {backgroundAsset ? (
          <BackgroundStatus
            asset={backgroundAsset}
            onRemove={() => clearBackground()}
          />
        ) : null}

        {imageAssets.length > 0 ? (
          <AssetStrip
            assets={imageAssets}
            onPromoteBackground={(id) => setAssetRole(id, 'background')}
            onPromoteFrame={(id) => setAssetRole(id, 'frame')}
            onUnuse={(id) => setAssetRole(id, 'unused')}
            onDelete={(id) => removeAsset(id)}
          />
        ) : null}
      </section>

      {/* ── Stamp ────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <p className="text-sm font-medium text-zinc-300">Stamp</p>

        <PerforationSlider
          label="Perforation"
          defaultValue={perforationCount}
          minValue={0}
          maxValue={28}
          onChange={setPerforationCount}
        />

        <div className="flex items-center justify-between">
          <span
            className={`text-sm transition-colors ${
              colorPickerDisabled ? 'text-zinc-600' : 'text-zinc-400'
            }`}
            title={
              colorPickerDisabled
                ? 'Color is hidden behind the image background'
                : undefined
            }
          >
            Color
          </span>
          <div
            className={`flex items-center gap-2 transition-opacity ${
              colorPickerDisabled ? 'pointer-events-none opacity-40' : ''
            }`}
            aria-disabled={colorPickerDisabled}
          >
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setStampColor(color)}
                title={color}
                className="h-5 w-5 rounded-full transition-transform hover:scale-110 focus:outline-none"
                style={{
                  background: color,
                  outline:
                    stampColor === color
                      ? '2px solid white'
                      : '2px solid transparent',
                  outlineOffset: '1px',
                  boxShadow:
                    color === '#ffffff' || color === '#d4d4d4'
                      ? 'inset 0 0 0 1px rgba(0,0,0,0.15)'
                      : undefined,
                }}
              />
            ))}

            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setPickerOpen((o) => !o)}
                title="Custom color"
                className="h-5 w-5 rounded-full transition-transform hover:scale-110 focus:outline-none"
                style={{
                  background:
                    'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                  outline:
                    !COLOR_PRESETS.includes(stampColor) && pickerOpen
                      ? '2px solid white'
                      : '2px solid transparent',
                  outlineOffset: '1px',
                }}
              />
              {pickerOpen && !colorPickerDisabled && (
                <div
                  className="absolute right-0 top-7 z-50"
                  onMouseLeave={() => setPickerOpen(false)}
                >
                  <ChromePicker
                    color={stampColor}
                    onChange={(c) => setStampColor(c.hex)}
                    disableAlpha
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Hidden file input + crop/role modals (mounted once) */}
      {upload.fileInputElement}
      {upload.overlayElement}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Background status row — shown when an image bg is active
// ────────────────────────────────────────────────────────────────────────────

function BackgroundStatus({
  asset,
  onRemove,
}: {
  asset: ImageAsset
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/40 px-2.5 py-1.5">
      <img
        src={asset.src}
        alt=""
        className="h-7 w-7 shrink-0 rounded object-cover"
      />
      <span className="flex-1 text-xs text-zinc-400">Background image</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      >
        Remove
      </button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Asset thumbnails — full uploaded list with a quick role-toggle menu.
// Multi-image management will get its own dedicated panel later; this is the
// minimum surface to validate the data model and let the user re-promote.
// ────────────────────────────────────────────────────────────────────────────

function AssetStrip({
  assets,
  onPromoteBackground,
  onPromoteFrame,
  onUnuse,
  onDelete,
}: {
  assets: ImageAsset[]
  onPromoteBackground: (id: string) => void
  onPromoteFrame: (id: string) => void
  onUnuse: (id: string) => void
  onDelete: (id: string) => void
}) {
  // Capture both the open asset id AND its trigger element together: the
  // popover lives in a portal and needs the anchor in viewport coords, but
  // reading a ref map during render would violate `react-hooks/refs`. By
  // storing the live element in state, the portal positions deterministically
  // and reposition listeners always have a fresh reference.
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
        Uploads ({assets.length})
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
                  : asset.role === 'frame'
                    ? 'border-zinc-500'
                    : 'border-zinc-800 hover:border-zinc-700'
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
              ) : asset.role === 'frame' ? (
                <span className="absolute bottom-0.5 right-0.5 rounded bg-zinc-200/90 px-1 text-[8px] font-medium uppercase tracking-wider text-zinc-900">
                  fr
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
          onPromoteFrame={onPromoteFrame}
          onUnuse={onUnuse}
          onDelete={onDelete}
        />
      ) : null}
    </div>
  )
}

/**
 * Portal-rendered popover that positions itself just below an anchor button
 * in viewport coordinates. Living outside the sidebar means it isn't clipped
 * by the sidebar's overflow rules — the previous inline menu got cut off
 * because `overflow-y-auto` on the panel implicitly clips horizontal overflow
 * too.
 *
 * The popover prefers right-aligning to the anchor (matches the previous
 * inline behaviour visually) but flips to left-aligned if that would push it
 * off the left side of the viewport, and clamps to the viewport's right edge
 * if right-alignment would push it off-screen.
 */
function AssetMenuPopover({
  anchor,
  onClose,
  asset,
  onPromoteBackground,
  onPromoteFrame,
  onUnuse,
  onDelete,
}: {
  anchor: HTMLElement
  onClose: () => void
  asset: ImageAsset
  onPromoteBackground: (id: string) => void
  onPromoteFrame: (id: string) => void
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

      // Prefer right-aligned to the anchor; flip left if it would clip.
      let left = a.right - pw
      if (left < margin) left = a.left
      if (left + pw > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - pw - margin)
      }

      // Below the anchor unless that overflows the viewport, then above.
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

  // Outside-click + Escape dismiss.
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
        // Hide until measured to avoid a one-frame flash at -9999.
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
        Set as background
      </MenuItem>
      <MenuItem
        onClick={() => {
          onPromoteFrame(asset.id)
          onClose()
        }}
        disabled={asset.role === 'frame'}
      >
        Add as frame
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
        Delete upload
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
