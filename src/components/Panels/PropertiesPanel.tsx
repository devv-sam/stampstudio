import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

import { useStampEditor } from "../../hooks/useStampEditor";

import { ActiveTextTypography } from "./ActiveTextTypography";
import { ColorPickerPortal } from "../UI/ColorPickerPortal";
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
import type { StampSnapPreset } from "../../utils/stampSnapSizes";
import {
  SNAP_PRESETS_LANDSCAPE,
  SNAP_PRESETS_PORTRAIT,
  SNAP_PRESETS_SQUARE,
} from "../../utils/stampSnapSizes";

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

/**
 * Stamp solid fill — paper / postage tones (not the same as typography neutrals).
 */
const FILL_COLOR_PRESETS = [
  "#ffffff",
  "#f7f5f0",
  "#ebe6dc",
  "#d4e8f2",
  "#f2e8f5",
  "#e6f2ea",
  "#c9b8a4",
  "#6b7d8c",
  "#2a2520",
] as const;

const FILL_PRESET_HEX = new Set(FILL_COLOR_PRESETS.map((c) => c.toLowerCase()));

const FILL_LIGHT_SWATCH = new Set([
  "#ffffff",
  "#f7f5f0",
  "#ebe6dc",
  "#d4e8f2",
  "#f2e8f5",
  "#e6f2ea",
]);

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
    frameAssets,
    setAssetRole,
    removeAsset,
    clearBackground,
    activeShader,
    setActiveShader,
    shaderParams,
    updateShaderParam,
    stampDimensions,
    textLayers,
    applyStampSizePreset,
    snapToPresetsEnabled,
    setSnapToPresetsEnabled,
    outlineMode,
    setOutlineMode,
    toggleOutlineMode,
  } = useStampEditor();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "y") return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      e.preventDefault();
      toggleOutlineMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleOutlineMode]);

  const bgUpload = useImageUploadFlow();

  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLButtonElement>(null);
  const [fillTab, setFillTab] = useState<"solid" | "image">("solid");
  const fillKind: "solid" | "image" = backgroundAsset ? "image" : fillTab;
  /** Open accordion only — does not turn the canvas effect off when collapsed. */
  const [expandedShader, setExpandedShader] = useState<ShaderName | null>(null);
  type SizePresetCategory = "square" | "landscape" | "portrait";
  const [expandedSizeCategory, setExpandedSizeCategory] =
    useState<SizePresetCategory | null>(null);

  const toggleSizeCategory = (cat: SizePresetCategory) => {
    setExpandedSizeCategory((c) => (c === cat ? null : cat));
  };

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

  const presetResizeWarn =
    "You have text or frame images on this stamp. Changing size may shift their layout. Continue?";

  const tryApplySizePreset = (p: StampSnapPreset) => {
    const { w, h } = p;
    if (
      Math.abs(stampDimensions.width - w) <= 1 &&
      Math.abs(stampDimensions.height - h) <= 1
    ) {
      return;
    }
    if (
      (textLayers.length > 0 || frameAssets.length > 0) &&
      !window.confirm(presetResizeWarn)
    ) {
      return;
    }
    applyStampSizePreset(w, h);
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
              {FILL_COLOR_PRESETS.map((color) => {
                const hex = color.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onPickPreset(color)}
                    title={color}
                    className="h-5 w-5 cursor-pointer rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{
                      background: color,
                      outline:
                        stampColor.toLowerCase() === hex
                          ? "2px solid white"
                          : "2px solid transparent",
                      outlineOffset: "1px",
                      boxShadow: FILL_LIGHT_SWATCH.has(hex)
                        ? "inset 0 0 0 1px rgba(0,0,0,0.15)"
                        : undefined,
                    }}
                  />
                );
              })}

              <div className="relative shrink-0">
                <button
                  ref={pickerRef}
                  type="button"
                  onClick={() => setPickerOpen((o) => !o)}
                  title="Custom color"
                  className="h-5 w-5 cursor-pointer rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    background:
                      "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                    outline:
                      !FILL_PRESET_HEX.has(stampColor.toLowerCase()) &&
                      pickerOpen
                        ? "2px solid white"
                        : "2px solid transparent",
                    outlineOffset: "1px",
                  }}
                />
                {pickerOpen && pickerRef.current ? (
                  <ColorPickerPortal
                    anchorEl={pickerRef.current}
                    colorHex={stampColor}
                    onPick={(hex) => {
                      void pickSolidStampColor(hex);
                      setFillTab("solid");
                    }}
                    onClose={() => setPickerOpen(false)}
                  />
                ) : null}
              </div>
            </div>
          ) : backgroundAsset ? (
            <div className="group flex w-full items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/40 px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => bgUpload.open()}
                title="Replace background image"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md -m-0.5 p-0.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
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
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-zinc-100 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <IconDismiss />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => bgUpload.open()}
              className="w-full cursor-pointer rounded-lg border border-dashed border-zinc-700 bg-transparent px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900/40"
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
            onPromoteFrame={(id) => setAssetRole(id, "frame")}
            onUnuse={(id) => setAssetRole(id, "unused")}
            onRecrop={(asset) => bgUpload.openRecrop(asset)}
            onDelete={(id) => removeAsset(id)}
          />
        ) : null}
      </section>

      <ActiveTextTypography />

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
          title="Dithering"
          expanded={expandedShader === "image-dithering"}
          dimmed={
            expandedShader !== null && expandedShader !== "image-dithering"
          }
          onToggle={() => openShaderAccordion("image-dithering")}
        >
          <div className="space-y-3 pt-1">
            <PerforationSlider
              key={`dither-size-${shaderParams["image-dithering"].size}`}
              label="Size"
              defaultValue={shaderParams["image-dithering"].size}
              minValue={1}
              maxValue={10}
              onChange={(v) => updateShaderParam("image-dithering", "size", v)}
            />
            <div className="space-y-1.5">
              <span className="text-[11px] text-zinc-500">Preset</span>
              <div
                className="flex flex-wrap gap-1"
                role="group"
                aria-label="Dithering preset"
              >
                {(
                  [
                    ["default", "Default"],
                    ["noise", "Noise"],
                    ["retro", "Retro"],
                  ] as const
                ).map(([value, label]) => (
                  <SegmentTab
                    key={value}
                    pressed={shaderParams["image-dithering"].preset === value}
                    onClick={() =>
                      updateShaderParam(
                        "image-dithering",
                        "preset",
                        shaderParams["image-dithering"].preset === value
                          ? "natural"
                          : value,
                      )
                    }
                    label={label}
                  />
                ))}
              </div>
            </div>
          </div>
        </ShaderAccordionRow>
      </section>

      <section className="space-y-5 border-t border-zinc-800 pt-5">
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Canvas
          </p>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="min-w-0 flex-1">
                <span className="block text-[11px] font-medium leading-tight text-zinc-300">
                  Snap to presets
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={snapToPresetsEnabled}
                aria-label="Snap to recommended sizes"
                onClick={() => setSnapToPresetsEnabled(!snapToPresetsEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border p-px transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400/60 ${
                  snapToPresetsEnabled
                    ? "border-zinc-400 bg-zinc-200"
                    : "border-zinc-700 bg-zinc-950"
                }`}
              >
                <motion.span
                  aria-hidden
                  className={`pointer-events-none block h-3.5 w-3.5 rounded-full shadow-sm ring-1 ring-black/20 ${
                    snapToPresetsEnabled ? "bg-zinc-900" : "bg-zinc-400"
                  }`}
                  animate={{ x: snapToPresetsEnabled ? 16 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              </button>
            </div>
            <div
              className="flex items-center gap-2.5"
              title="Wireframe view of stamp layers (⌘Y)"
            >
              <div className="min-w-0 flex-1">
                <span className="block text-[11px] font-medium leading-tight text-zinc-300">
                  Outline
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={outlineMode}
                aria-label="Outline mode"
                onClick={() => setOutlineMode(!outlineMode)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border p-px transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400/60 ${
                  outlineMode
                    ? "border-zinc-400 bg-zinc-200"
                    : "border-zinc-700 bg-zinc-950"
                }`}
              >
                <motion.span
                  aria-hidden
                  className={`pointer-events-none block h-3.5 w-3.5 rounded-full shadow-sm ring-1 ring-black/20 ${
                    outlineMode ? "bg-zinc-900" : "bg-zinc-400"
                  }`}
                  animate={{ x: outlineMode ? 16 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Presets
          </p>
          <div className="-mx-5 -mt-2.5 divide-y divide-zinc-800">
            <SizePresetCategoryAccordion
              title="Square"
              expanded={expandedSizeCategory === "square"}
              onToggle={() => toggleSizeCategory("square")}
            >
              <SizePresetChipGrid
                ariaLabel="Square size presets"
                presets={SNAP_PRESETS_SQUARE}
                stampDimensions={stampDimensions}
                onPick={tryApplySizePreset}
              />
            </SizePresetCategoryAccordion>
            <SizePresetCategoryAccordion
              title="Landscape"
              expanded={expandedSizeCategory === "landscape"}
              onToggle={() => toggleSizeCategory("landscape")}
            >
              <SizePresetChipGrid
                ariaLabel="Landscape size presets"
                presets={SNAP_PRESETS_LANDSCAPE}
                stampDimensions={stampDimensions}
                onPick={tryApplySizePreset}
              />
            </SizePresetCategoryAccordion>
            <SizePresetCategoryAccordion
              title="Portrait"
              expanded={expandedSizeCategory === "portrait"}
              onToggle={() => toggleSizeCategory("portrait")}
            >
              <SizePresetChipGrid
                ariaLabel="Portrait size presets"
                presets={SNAP_PRESETS_PORTRAIT}
                stampDimensions={stampDimensions}
                onPick={tryApplySizePreset}
              />
            </SizePresetCategoryAccordion>
          </div>
        </div>
      </section>

      {bgUpload.fileInputElement}
      {bgUpload.overlayElement}
    </div>
  );
}

/** Fit preset into a square cell so larger presets read visibly larger in the row. */
function sizePresetPreviewPx(preset: StampSnapPreset, cellPx: number) {
  const m = Math.max(preset.w, preset.h);
  const s = cellPx / m;
  return {
    width: Math.max(2, preset.w * s),
    height: Math.max(2, preset.h * s),
  };
}

function SizePresetCategoryAccordion({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-2 px-5 py-2.5 text-left text-[13px] text-zinc-100 transition-colors hover:bg-zinc-800/50 focus:outline-none focus-visible:bg-zinc-800/50 focus-visible:ring-2 focus-visible:ring-white/15"
        aria-expanded={expanded}
      >
        <span
          className="flex h-4 w-4 shrink-0 items-center justify-center text-zinc-400"
          aria-hidden
        >
          <svg
            viewBox="0 0 10 10"
            className={`h-2 w-2 transition-transform duration-200 ease-out ${
              expanded ? "rotate-90" : ""
            }`}
            aria-hidden
          >
            <path d="M2.5 1.5 L8 5 L2.5 8.5 Z" fill="currentColor" />
          </svg>
        </span>
        <span className="font-medium">{title}</span>
      </button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="content"
            initial={{ maxHeight: 0, opacity: 0 }}
            animate={{ maxHeight: 320, opacity: 1 }}
            exit={{ maxHeight: 0, opacity: 0 }}
            transition={{
              maxHeight: {
                duration: 0.22,
                ease: [0.4, 0, 0.2, 1],
              },
              opacity: { duration: 0.15 },
            }}
            style={{ overflow: "hidden" }}
          >
            <div className="min-w-0 pb-3 pl-11 pr-5 pt-0.5">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SizePresetChipGrid({
  presets,
  stampDimensions,
  onPick,
  ariaLabel,
}: {
  presets: readonly StampSnapPreset[];
  stampDimensions: { width: number; height: number };
  onPick: (p: StampSnapPreset) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={ariaLabel}>
      {presets.map((p) => (
        <SizePresetChip
          key={`${p.w}-${p.h}`}
          preset={p}
          active={
            Math.abs(stampDimensions.width - p.w) <= 1 &&
            Math.abs(stampDimensions.height - p.h) <= 1
          }
          onPick={() => onPick(p)}
        />
      ))}
    </div>
  );
}

function SizePresetChip({
  preset,
  active,
  onPick,
}: {
  preset: StampSnapPreset;
  active: boolean;
  onPick: () => void;
}) {
  const preview = sizePresetPreviewPx(preset, 26);
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      aria-label={`${preset.w} by ${preset.h} pixels`}
      className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 font-mono text-[10px] tabular-nums transition-colors ${
        active
          ? "bg-zinc-700 text-zinc-100"
          : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
      }`}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center"
        aria-hidden
      >
        <span
          className={`box-border shrink-0 rounded-[1px] border bg-transparent ${
            active ? "border-zinc-50" : "border-white/55"
          }`}
          style={{ width: preview.width, height: preview.height }}
        />
      </span>
      <span>
        {preset.w}×{preset.h}
      </span>
    </button>
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
      className={`flex h-7 cursor-pointer items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors ${
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
              className={`relative aspect-square w-full cursor-pointer overflow-hidden rounded-md border bg-zinc-900 transition-colors ${
                asset.role === "background"
                  ? "border-white/80"
                  : asset.role === "frame"
                    ? "border-zinc-500/80"
                    : "border-zinc-800 hover:border-zinc-700"
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
              ) : asset.role === "frame" ? (
                <span className="absolute bottom-0.5 right-0.5 rounded bg-zinc-300/95 px-1 text-[8px] font-bold uppercase tracking-wider text-zinc-950">
                  fr
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
      className={`cursor-pointer rounded px-2 py-1.5 text-left transition-colors disabled:pointer-events-none disabled:opacity-40 ${
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
        <ColorPickerPortal
          anchorEl={picker.anchor}
          colorHex={colors[picker.key]}
          onPick={(hx) => onPick(picker.key, hx)}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </>
  );
}
