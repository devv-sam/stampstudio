import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useStampEditor } from "../../hooks/useStampEditor";
import type { ImageAsset } from "../../types/assets";

export function DeskDrawer({
  onRecrop,
  onPick,
  pickedSrc,
}: {
  onRecrop: (asset: ImageAsset) => void;
  /** pick mode, used by the disc: a tap hands the image over instead of opening the role menu */
  onPick?: (src: string) => void;
  pickedSrc?: string | null;
}) {
  const { imageAssets, setAssetRole, removeAsset } = useStampEditor();

  if (onPick && imageAssets.length > 0) {
    return (
      <div className="space-y-2">
        <p className="text-base">Library ({imageAssets.length})</p>
        <div className="grid grid-cols-4 gap-2">
          {imageAssets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => onPick(asset.src)}
              aria-pressed={asset.src === pickedSrc}
              className={`relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg border-2 bg-zinc-900 transition-colors ${
                asset.src === pickedSrc
                  ? "border-cornflower"
                  : "border-transparent hover:border-zinc-600"
              }`}
              title="Use on the disc"
            >
              <img
                src={asset.src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {imageAssets.length > 0 ? (
        <AssetStrip
          assets={imageAssets}
          onPromoteBackground={(id) => setAssetRole(id, "background")}
          onPromoteFrame={(id) => setAssetRole(id, "frame")}
          onUnuse={(id) => setAssetRole(id, "unused")}
          onRecrop={onRecrop}
          onDelete={(id) => removeAsset(id)}
        />
      ) : (
        <p className="text-sm text-ink-soft">Your uploads show up here.</p>
      )}
    </div>
  );
}

function AssetStrip({
  assets,
  onPromoteBackground,
  onPromoteFrame,
  onUnuse,
  onRecrop,
  onDelete,
}: {
  assets: ImageAsset[];
  onPromoteBackground: (id: string) => void;
  onPromoteFrame: (id: string) => void;
  onUnuse: (id: string) => void;
  onRecrop: (asset: ImageAsset) => void;
  onDelete: (id: string) => void;
}) {
  const [openMenu, setOpenMenu] = useState<{
    id: string;
    anchor: HTMLButtonElement;
  } | null>(null);

  const close = () => setOpenMenu(null);
  const openAsset = openMenu
    ? (assets.find((a) => a.id === openMenu.id) ?? null)
    : null;

  return (
    <div className="space-y-2">
      <p className="text-base">Library ({assets.length})</p>
      <div className="grid grid-cols-4 gap-2">
        {assets.map((asset) => {
          const open = openMenu?.id === asset.id;
          return (
            <button
              key={asset.id}
              type="button"
              onClick={(e) =>
                setOpenMenu(
                  open ? null : { id: asset.id, anchor: e.currentTarget },
                )
              }
              className={`relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg border-2 bg-zinc-900 transition-colors ${
                asset.role === "background"
                  ? "border-cornflower"
                  : asset.role === "frame"
                    ? "border-marigold"
                    : "border-transparent hover:border-zinc-600"
              }`}
              title={asset.role}
            >
              <img
                src={asset.src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              {asset.role === "background" ? (
                <span className="absolute bottom-0.5 right-0.5 rounded bg-cornflower px-1 text-[10px] text-ink">
                  Bg
                </span>
              ) : asset.role === "frame" ? (
                <span className="absolute bottom-0.5 right-0.5 rounded bg-marigold px-1 text-[10px] text-ink">
                  Fr
                </span>
              ) : null}
            </button>
          );
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
          onRecrop={onRecrop}
          onDelete={onDelete}
        />
      ) : null}
    </div>
  );
}

function AssetMenuPopover({
  anchor,
  onClose,
  asset,
  onPromoteBackground,
  onPromoteFrame,
  onUnuse,
  onRecrop,
  onDelete,
}: {
  anchor: HTMLElement;
  onClose: () => void;
  asset: ImageAsset;
  onPromoteBackground: (id: string) => void;
  onPromoteFrame: (id: string) => void;
  onUnuse: (id: string) => void;
  onRecrop: (asset: ImageAsset) => void;
  onDelete: (id: string) => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  useLayoutEffect(() => {
    const reposition = () => {
      const popover = popoverRef.current;
      if (!popover) return;
      const a = anchor.getBoundingClientRect();
      const pw = popover.offsetWidth;
      const ph = popover.offsetHeight;
      const margin = 8;

      let left = a.right - pw;
      if (left < margin) left = a.left;
      if (left + pw > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - pw - margin);
      }

      let top = a.bottom + 4;
      if (top + ph > window.innerHeight - margin) {
        top = Math.max(margin, a.top - ph - 4);
      }

      setPosition({ left, top });
    };
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [anchor]);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      const popover = popoverRef.current;
      if (!popover) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (popover.contains(target) || anchor.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  const menu = (
    <div
      ref={popoverRef}
      role="menu"
      className="paper-ui fixed z-[60] flex min-w-[180px] flex-col rounded-2xl bg-card p-1.5 text-sm shadow-chunky"
      style={{
        left: position?.left ?? -9999,
        top: position?.top ?? -9999,
        visibility: position ? "visible" : "hidden",
      }}
    >
      <MenuItem
        onClick={() => {
          onPromoteBackground(asset.id);
          onClose();
        }}
        disabled={asset.role === "background"}
      >
        Use as background
      </MenuItem>
      <MenuItem
        onClick={() => {
          onPromoteFrame(asset.id);
          onClose();
        }}
        disabled={asset.role === "frame"}
      >
        Use as frame
      </MenuItem>
      {asset.role !== "unused" ? (
        <MenuItem
          onClick={() => {
            onUnuse(asset.id);
            onClose();
          }}
        >
          Hide from stamp
        </MenuItem>
      ) : null}
      <MenuItem
        onClick={() => {
          onRecrop(asset);
          onClose();
        }}
      >
        Recrop
      </MenuItem>
      <div className="my-1 h-px bg-zinc-800" />
      <MenuItem
        onClick={() => {
          onDelete(asset.id);
          onClose();
        }}
        danger
      >
        Delete
      </MenuItem>
    </div>
  );

  return createPortal(menu, document.body);
}

function MenuItem({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`cursor-pointer rounded-xl px-2 py-1.5 text-left transition-colors disabled:pointer-events-none disabled:opacity-40 ${
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}
