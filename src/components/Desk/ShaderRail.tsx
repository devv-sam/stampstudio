import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useStampEditor } from "../../hooks/useStampEditor";
import { ShaderLayer } from "../Canvas/ShaderLayer";
import { ColorPickerPortal } from "../UI/ColorPickerPortal";
import { PerforationSlider } from "../UI/PerforationSlider";
import type {
  FlutedGlassPattern,
  HalftoneCmykStyle,
  HalftoneDotsStyle,
  ShaderName,
  ShaderParamsMap,
} from "../../types/canvas";
import { useDeskMotion } from "../../utils/deskMotion";

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

const LIGHT_SWATCH = new Set([
  "#ffffff",
  "#f5f5f5",
  "#e5e5e5",
  "#d4d4d4",
  "#a3a3a3",
  "#fbfaf5",
  "#fbfaf4",
]);

const SHADERS: readonly { name: ShaderName; label: string }[] = [
  { name: "halftone-dots", label: "Halftone dots" },
  { name: "fluted-glass", label: "Fluted glass" },
  { name: "halftone-cmyk", label: "Halftone CMYK" },
  { name: "image-dithering", label: "Dithering" },
];

const THUMB_RECT = { left: 0, top: 0, width: 104, height: 72 };

export function ShaderRail() {
  const { blurPop, press } = useDeskMotion();
  const {
    activeShader,
    setActiveShader,
    shaderParams,
    stampColor,
    backgroundAsset,
  } = useStampEditor();

  return (
    <div className="pointer-events-auto relative">
      <div
        role="group"
        aria-label="Print effects"
        className="desk-card flex gap-3 p-3 max-md:overflow-x-auto md:flex-col"
      >
        {SHADERS.map(({ name, label }) => {
          const on = activeShader === name;
          return (
            <motion.button
              key={name}
              type="button"
              {...press}
              aria-pressed={on}
              onClick={() => setActiveShader(on ? null : name)}
              className="flex w-[104px] shrink-0 cursor-pointer flex-col gap-1 text-left text-sm"
            >
              <span
                className={`relative block h-[72px] w-full overflow-hidden rounded-xl bg-[#fff] ${
                  on ? "outline-3 outline-offset-2 outline-cornflower" : ""
                }`}
              >
                <ShaderLayer
                  rect={THUMB_RECT}
                  imageSrc={backgroundAsset?.src ?? ""}
                  stampColor={stampColor}
                  activeShader={name}
                  shaderParams={shaderParams}
                />
              </span>
              <span className="truncate">{label}</span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {activeShader ? (
          <motion.div
            key={activeShader}
            {...blurPop}
            className="desk-card absolute z-30 w-60 space-y-3 p-3 max-md:bottom-full max-md:left-0 max-md:mb-2 md:left-full md:top-0 md:ml-3"
          >
            <ShaderParams shader={activeShader} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ShaderParams({ shader }: { shader: ShaderName }) {
  const { shaderParams, updateShaderParam } = useStampEditor();

  if (shader === "halftone-dots") {
    return (
      <>
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
              <span className="text-sm text-zinc-500">Dot style</span>
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
      </>
    );
  }

  if (shader === "fluted-glass") {
    return (
      <>
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
              <span className="text-sm text-zinc-500">Pattern</span>
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
      </>
    );
  }

  if (shader === "halftone-cmyk") {
    return (
      <>
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
              <span className="text-sm text-zinc-500">Print type</span>
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
      </>
    );
  }

  return (
    <>
            <PerforationSlider
              key={`dither-size-${shaderParams["image-dithering"].size}`}
              label="Size"
              defaultValue={shaderParams["image-dithering"].size}
              minValue={1}
              maxValue={10}
              onChange={(v) => updateShaderParam("image-dithering", "size", v)}
            />
            <div className="space-y-1.5">
              <span className="text-sm text-zinc-500">Preset</span>
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
    </>
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
      className={`cursor-pointer rounded-lg px-2.5 py-1 text-sm transition-colors ${
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
