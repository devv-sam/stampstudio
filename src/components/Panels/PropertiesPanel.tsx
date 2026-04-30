import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { ChromePicker } from "react-color";

import { useStampEditor } from "../../hooks/useStampEditor";
import { PerforationSlider } from "../UI/PerforationSlider";
import { useImageUploadFlow } from "../../hooks/useImageUploadFlow";
import type { ImageAsset } from "../../types/assets";
import type {
  FlutedGlassPattern,
  HalftoneCmykStyle,
  HalftoneDotsStyle,
  ShaderName,
  ShaderParamsMap,
} from "../../types/canvas";

type CmykInkKey = keyof Pick<
  ShaderParamsMap["halftone-cmyk"],
  "colorBack" | "colorC" | "colorM" | "colorY" | "colorK"
>;

const CMYK_INK_ORDER: readonly { key: CmykInkKey; aria: string }[] = [
  { key: "colorBack", aria: "Paper color" },
  { key: "colorC", aria: "Cyan ink" },
  { key: "colorM", aria: "Magenta ink" },
  { key: "colorY", aria: "Yellow ink" },
  { key: "colorK", aria: "Black ink" },
];

/** Original five neutrals plus four mid-steps for a fuller gradient row. */
const COLOR_PRESETS = [
  "#ffffff",
  "#f5f5f5",
  "#e5e5e5",
  "#d4d4d4",
  "#a3a3a3",
  "#737373",
  "#262626",
  "#404040",
  "#0a0a0a",
] as const;

const PRESET_HEX = new Set(COLOR_PRESETS.map((c) => c.toLowerCase()));

const LIGHT_SWATCH = new Set([
  "#ffffff",
  "#f5f5f5",
  "#e5e5e5",
  "#d4d4d4",
  "#a3a3a3",
  "#fbfaf5",
  "#fbfaf4",
]);

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
    activeShader,
    setActiveShader,
    shaderParams,
    updateShaderParam,
  } = useStampEditor();

  const bgUpload = useImageUploadFlow();

  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [fillTab, setFillTab] = useState<"solid" | "image">("solid");
  const fillKind: "solid" | "image" = backgroundAsset ? "image" : fillTab;
  /** Open accordion only — does not turn the canvas effect off when collapsed. */
  const [expandedShader, setExpandedShader] = useState<ShaderName | null>(null);

  const openShaderAccordion = (name: ShaderName) => {
    if (expandedShader === name) {
      setExpandedShader(null);
      return;
    }
    setExpandedShader(name);
    setActiveShader(name);
  };

  const onPickPreset = (color: string) => {
    void pickSolidStampColor(color);
    setFillTab("solid");
    setPickerOpen(false);
  };

  const onSolidTab = () => {
    if (backgroundAsset) void pickSolidStampColor(stampColor);
    setFillTab("solid");
    setPickerOpen(false);
  };

  const onImageTab = () => {
    setFillTab("image");
  };

  const handleClearBg = () => {
    void clearBackground();
    setFillTab("solid");
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        {/* Fill: Solid | Image toggle, then presets+picker or compact image — above perforation */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Fill
            </p>{" "}
            <div
              className="cursor-pointer inline-flex shrink-0 rounded-md border border-zinc-700/90 bg-zinc-900/50 p-0.5"
              role="group"
              aria-label="Fill type"
            >
              <FillTypeTab
                pressed={fillKind === "solid"}
                onClick={onSolidTab}
                label="Solid"
                icon={<IconSolidSwatch />}
              />
              <FillTypeTab
                pressed={fillKind === "image"}
                onClick={onImageTab}
                label="Image"
                icon={<IconImageFill />}
              />
            </div>
          </div>

          {fillKind === "solid" ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {COLOR_PRESETS.map((color) => {
                const hex = color.toLowerCase();
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
                          ? "2px solid white"
                          : "2px solid transparent",
                      outlineOffset: "1px",
                      boxShadow: LIGHT_SWATCH.has(hex)
                        ? "inset 0 0 0 1px rgba(0,0,0,0.15)"
                        : undefined,
                    }}
                  />
                );
              })}

              <div className="relative shrink-0" ref={pickerRef}>
                <button
                  type="button"
                  onClick={() => setPickerOpen((o) => !o)}
                  title="Custom color"
                  className="h-5 w-5 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    background:
                      "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                    outline:
                      !PRESET_HEX.has(stampColor.toLowerCase()) && pickerOpen
                        ? "2px solid white"
                        : "2px solid transparent",
                    outlineOffset: "1px",
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
                        void pickSolidStampColor(c.hex);
                        setFillTab("solid");
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
                  title={backgroundAsset.fileName ?? "Background image"}
                >
                  {backgroundAsset.fileName ?? "Background image"}
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
            onPromoteBackground={(id) => setAssetRole(id, "background")}
            onUnuse={(id) => setAssetRole(id, "unused")}
            onRecrop={(asset) => bgUpload.openRecrop(asset)}
            onDelete={(id) => removeAsset(id)}
          />
        ) : null}
      </section>

      <section className="space-y-3 border-t border-zinc-800 pt-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Shaders
          </p>
          {activeShader ? (
            <button
              type="button"
              onClick={() => {
                setActiveShader(null);
                setExpandedShader(null);
              }}
              className="text-[10px] text-zinc-500 cursor-pointer underline-offset-2 transition-colors hover:text-zinc-300 hover:underline"
            >
              Clear effect
            </button>
          ) : null}
        </div>

        <ShaderAccordionRow
          title="Halftone dots"
          expanded={expandedShader === "halftone-dots"}
          dimmed={expandedShader !== null && expandedShader !== "halftone-dots"}
          onToggle={() => openShaderAccordion("halftone-dots")}
        >
          <div className="space-y-3 pt-1">
            <PerforationSlider
              key={`hd-size-${shaderParams["halftone-dots"].size}`}
              label="Size"
              defaultValue={Math.round(
                shaderParams["halftone-dots"].size * 100,
              )}
              minValue={5}
              maxValue={95}
              onChange={(v) =>
                updateShaderParam("halftone-dots", "size", v / 100)
              }
            />
            <PerforationSlider
              key={`hd-contrast-${shaderParams["halftone-dots"].contrast}`}
              label="Contrast"
              defaultValue={Math.round(
                shaderParams["halftone-dots"].contrast * 100,
              )}
              minValue={0}
              maxValue={100}
              onChange={(v) =>
                updateShaderParam("halftone-dots", "contrast", v / 100)
              }
            />
            <div className="space-y-1.5">
              <span className="text-[11px] text-zinc-500">Dot style</span>
              <div
                className="flex flex-wrap gap-1"
                role="group"
                aria-label="Halftone dot style"
              >
                {(
                  [
                    ["classic", "Classic"],
                    ["gooey", "Gooey"],
                    ["soft", "Soft"],
                    ["holes", "Holes"],
                  ] as const
                ).map(([value, label]) => (
                  <SegmentTab
                    key={value}
                    pressed={shaderParams["halftone-dots"].type === value}
                    onClick={() =>
                      updateShaderParam(
                        "halftone-dots",
                        "type",
                        value as HalftoneDotsStyle,
                      )
                    }
                    label={label}
                  />
                ))}
              </div>
            </div>
          </div>
        </ShaderAccordionRow>

        <ShaderAccordionRow
          title="Fluted glass"
          expanded={expandedShader === "fluted-glass"}
          dimmed={expandedShader !== null && expandedShader !== "fluted-glass"}
          onToggle={() => openShaderAccordion("fluted-glass")}
        >
          <div className="space-y-3 pt-1">
            <PerforationSlider
              key={`fg-size-${shaderParams["fluted-glass"].size}`}
              label="Stripe width"
              defaultValue={Math.round(shaderParams["fluted-glass"].size * 100)}
              minValue={5}
              maxValue={95}
              onChange={(v) =>
                updateShaderParam("fluted-glass", "size", v / 100)
              }
            />
            <PerforationSlider
              key={`fg-dist-${shaderParams["fluted-glass"].distortion}`}
              label="Distortion"
              defaultValue={Math.round(
                shaderParams["fluted-glass"].distortion * 100,
              )}
              minValue={0}
              maxValue={100}
              onChange={(v) =>
                updateShaderParam("fluted-glass", "distortion", v / 100)
              }
            />
            <div className="space-y-1.5">
              <span className="text-[11px] text-zinc-500">Pattern</span>
              <div
                className="flex flex-wrap gap-1"
                role="group"
                aria-label="Fluted glass pattern"
              >
                {(
                  [
                    ["lines", "Lines"],
                    ["wave", "Wave"],
                    ["linesIrregular", "Irregular"],
                  ] as const
                ).map(([value, label]) => (
                  <SegmentTab
                    key={value}
                    pressed={shaderParams["fluted-glass"].shape === value}
                    onClick={() =>
                      updateShaderParam(
                        "fluted-glass",
                        "shape",
                        value as FlutedGlassPattern,
                      )
                    }
                    label={label}
                  />
                ))}
              </div>
            </div>
          </div>
        </ShaderAccordionRow>

        <ShaderAccordionRow
          title="Halftone CMYK"
          expanded={expandedShader === "halftone-cmyk"}
          dimmed={expandedShader !== null && expandedShader !== "halftone-cmyk"}
          onToggle={() => openShaderAccordion("halftone-cmyk")}
        >
          <div className="min-w-0 w-full space-y-3 pt-1">
            <PerforationSlider
              key={`hc-size-${shaderParams["halftone-cmyk"].size}`}
              label="Dot size"
              defaultValue={Math.round(
                shaderParams["halftone-cmyk"].size * 100,
              )}
              minValue={2}
              maxValue={90}
              onChange={(v) =>
                updateShaderParam("halftone-cmyk", "size", v / 100)
              }
            />
            <PerforationSlider
              key={`hc-soft-${shaderParams["halftone-cmyk"].softness}`}
              label="Softness"
              defaultValue={Math.round(
                shaderParams["halftone-cmyk"].softness * 100,
              )}
              minValue={0}
              maxValue={100}
              onChange={(v) =>
                updateShaderParam("halftone-cmyk", "softness", v / 100)
              }
            />
            <div className="space-y-1.5">
              <span className="text-[11px] text-zinc-500">Print type</span>
              <div className="-mx-0.5 flex min-w-0 items-center gap-2 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:thin]">
                <div
                  className="flex shrink-0 flex-nowrap gap-1"
                  role="group"
                  aria-label="CMYK halftone print type"
                >
                  {(
                    [
                      ["dots", "Dots"],
                      ["ink", "Ink"],
                      ["sharp", "Sharp"],
                    ] as const
                  ).map(([value, label]) => (
                    <SegmentTab
                      key={value}
                      pressed={shaderParams["halftone-cmyk"].type === value}
                      onClick={() =>
                        updateShaderParam(
                          "halftone-cmyk",
                          "type",
                          value as HalftoneCmykStyle,
                        )
                      }
                      label={label}
                    />
                  ))}
                </div>
                <CmykInkSwatches
                  colors={{
                    colorBack: shaderParams["halftone-cmyk"].colorBack,
                    colorC: shaderParams["halftone-cmyk"].colorC,
                    colorM: shaderParams["halftone-cmyk"].colorM,
                    colorY: shaderParams["halftone-cmyk"].colorY,
                    colorK: shaderParams["halftone-cmyk"].colorK,
                  }}
                  onPick={(key, hex) =>
                    updateShaderParam("halftone-cmyk", key, hex)
                  }
                />
              </div>
            </div>
          </div>
        </ShaderAccordionRow>

        <ShaderAccordionRow
          title="Paper texture"
          expanded={expandedShader === "paper-texture"}
          dimmed={expandedShader !== null && expandedShader !== "paper-texture"}
          onToggle={() => openShaderAccordion("paper-texture")}
        >
          <div className="space-y-3 pt-1">
            <PerforationSlider
              key={`pt-rough-${shaderParams["paper-texture"].roughness}`}
              label="Roughness"
              defaultValue={Math.round(
                shaderParams["paper-texture"].roughness * 100,
              )}
              minValue={0}
              maxValue={100}
              onChange={(v) =>
                updateShaderParam("paper-texture", "roughness", v / 100)
              }
            />
            <PerforationSlider
              key={`pt-crumple-${shaderParams["paper-texture"].crumples}`}
              label="Crumples"
              defaultValue={Math.round(
                shaderParams["paper-texture"].crumples * 100,
              )}
              minValue={0}
              maxValue={100}
              onChange={(v) =>
                updateShaderParam("paper-texture", "crumples", v / 100)
              }
            />
            <PerforationSlider
              key={`pt-folds-${shaderParams["paper-texture"].folds}`}
              label="Folds"
              defaultValue={Math.round(
                shaderParams["paper-texture"].folds * 100,
              )}
              minValue={0}
              maxValue={100}
              onChange={(v) =>
                updateShaderParam("paper-texture", "folds", v / 100)
              }
            />
            <button
              type="button"
              onClick={() =>
                updateShaderParam(
                  "paper-texture",
                  "seed",
                  Math.round(Math.random() * 1000 * 10) / 10,
                )
              }
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/60 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
            >
              Randomize texture
            </button>
          </div>
        </ShaderAccordionRow>
      </section>

      {bgUpload.fileInputElement}
      {bgUpload.overlayElement}
    </div>
  );
}

function FillTypeTab({
  pressed,
  onClick,
  label,
  icon,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
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
          ? "bg-zinc-700 text-zinc-100 shadow-sm"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      <span className="flex shrink-0 items-center [&>svg]:block">{icon}</span>
      <span>{label}</span>
    </button>
  );
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
  );
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
  );
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
  );
}

function AssetStrip({
  assets,
  onPromoteBackground,
  onUnuse,
  onRecrop,
  onDelete,
}: {
  assets: ImageAsset[];
  onPromoteBackground: (id: string) => void;
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
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Library ({assets.length})
      </p>
      <div className="grid grid-cols-5 gap-1.5">
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
              className={`relative aspect-square w-full overflow-hidden rounded-md border bg-zinc-900 transition-colors ${
                asset.role === "background"
                  ? "border-white/80"
                  : asset.role === "unused"
                    ? "border-zinc-800 hover:border-zinc-700"
                    : "border-zinc-600"
              }`}
              title={asset.role}
            >
              <img
                src={asset.src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              {asset.role === "background" ? (
                <span className="absolute bottom-0.5 right-0.5 rounded bg-white/90 px-1 text-[8px] font-bold uppercase tracking-wider text-zinc-950">
                  bg
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
  onUnuse,
  onRecrop,
  onDelete,
}: {
  anchor: HTMLElement;
  onClose: () => void;
  asset: ImageAsset;
  onPromoteBackground: (id: string) => void;
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
      className="fixed z-[60] flex min-w-[160px] flex-col rounded-md border border-zinc-800 bg-[#141416] p-1 text-xs shadow-xl"
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
      className={`rounded px-2 py-1.5 text-left transition-colors disabled:pointer-events-none disabled:opacity-40 ${
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

function ShaderAccordionRow({
  title,
  expanded,
  dimmed,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  dimmed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={`transition-opacity duration-150 ${
        dimmed ? "opacity-35" : "opacity-100"
      }`}
    >
      <motion.button
        type="button"
        onClick={onToggle}
        whileTap={{ scale: 0.987, y: 0.5 }}
        transition={{ type: "spring", stiffness: 520, damping: 30, mass: 0.24 }}
        className="flex w-full cursor-pointer items-center justify-between gap-2 py-2 text-left text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-100 focus:outline-none focus-visible:text-zinc-100"
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span
          className="tabular-nums text-base font-light leading-none text-zinc-400"
          aria-hidden
        >
          {expanded ? "−" : "+"}
        </span>
      </motion.button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="content"
            initial={{ maxHeight: 0, opacity: 0 }}
            animate={{ maxHeight: 520, opacity: 1 }}
            exit={{ maxHeight: 0, opacity: 0 }}
            transition={{
              maxHeight: {
                type: "spring",
                stiffness: 220,
                damping: 24,
                mass: 0.72,
              },
              opacity: { duration: 0.2, ease: "easeOut" },
            }}
            style={{ overflow: "hidden" }}
          >
            <motion.div
              initial={{ y: -8 }}
              animate={{ y: 0 }}
              exit={{ y: -6 }}
              transition={{
                y: {
                  type: "spring",
                  stiffness: 260,
                  damping: 22,
                  mass: 0.62,
                },
              }}
              className="min-w-0 w-full space-y-3 pb-1 pt-0.5"
            >
              {children}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SegmentTab({
  pressed,
  onClick,
  label,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={pressed}
      onClick={onClick}
      className={`cursor-pointer rounded px-2 py-1 text-[10px] font-medium transition-colors ${
        pressed
          ? "bg-zinc-700 text-zinc-100 shadow-sm"
          : "bg-zinc-900/80 text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

function CmykPickerPopover({
  anchorEl,
  colorHex,
  onPick,
  onClose,
}: {
  anchorEl: HTMLElement;
  colorHex: string;
  onPick: (hex: string) => void;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  useLayoutEffect(() => {
    const reposition = () => {
      const popover = popoverRef.current;
      const a = anchorEl.getBoundingClientRect();
      if (!popover) {
        /** Placeholder before first paint — assume picker footprint */
        const guessW = 276;
        const guessH = 340;
        const margin = 8;
        const left = Math.min(
          innerWidth - margin - guessW,
          Math.max(margin, a.right - guessW),
        );
        let top = a.bottom + 6;
        if (top + guessH > innerHeight - margin) {
          top = Math.max(margin, a.top - guessH - 6);
        }
        setPosition({ left, top });
        return;
      }
      const pw = popover.offsetWidth;
      const ph = popover.offsetHeight;
      const margin = 8;

      let left = a.right - pw;
      if (left < margin) left = Math.max(margin, a.left - (pw - a.width));
      if (left + pw > innerWidth - margin) {
        left = Math.max(margin, innerWidth - pw - margin);
      }

      let top = a.bottom + 6;
      if (top + ph > innerHeight - margin) {
        top = Math.max(margin, a.top - ph - 6);
      }

      setPosition({ left, top });
    };

    reposition();
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(reposition);
    });
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [anchorEl]);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      const popover = popoverRef.current;
      if (!popover) return;
      const t = e.target as Node | null;
      if (!t) return;
      if (popover.contains(t) || anchorEl.contains(t)) return;
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
  }, [anchorEl, onClose]);

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[100]"
      style={{
        left: position?.left ?? -9999,
        top: position?.top ?? -9999,
        visibility: position ? "visible" : "hidden",
      }}
      onMouseDown={(e) => {
        /** Keep focus in picker; sidebar doesn't steal clicks */
        e.stopPropagation();
      }}
    >
      <div className="rounded-xl border border-zinc-700 bg-[#141416] shadow-2xl">
        <ChromePicker
          color={colorHex}
          onChange={(c) => onPick(c.hex)}
          disableAlpha
        />
      </div>
    </div>,
    document.body,
  );
}

function CmykInkSwatches({
  colors,
  onPick,
}: {
  colors: Pick<ShaderParamsMap["halftone-cmyk"], CmykInkKey>;
  onPick: (key: CmykInkKey, hex: string) => void;
}) {
  const [picker, setPicker] = useState<{
    key: CmykInkKey;
    anchor: HTMLElement;
  } | null>(null);

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        {CMYK_INK_ORDER.map(({ key, aria }) => {
          const hex = colors[key];
          const isOpen = picker?.key === key;
          return (
            <button
              key={key}
              type="button"
              aria-label={aria}
              aria-expanded={isOpen}
              onClick={(e) => {
                setPicker(
                  isOpen
                    ? null
                    : { key, anchor: e.currentTarget as HTMLElement },
                );
              }}
              className="h-6 w-6 shrink-0 cursor-pointer rounded-md ring-1 ring-inset ring-zinc-950/25 transition-[transform] hover:scale-[1.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              style={{
                backgroundColor: hex,
                boxShadow: LIGHT_SWATCH.has(hex.toLowerCase())
                  ? "inset 0 0 0 1px rgba(0,0,0,0.18)"
                  : undefined,
              }}
            />
          );
        })}
      </div>

      {picker ? (
        <CmykPickerPopover
          anchorEl={picker.anchor}
          colorHex={colors[picker.key]}
          onPick={(hx) => onPick(picker.key, hx)}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </>
  );
}
