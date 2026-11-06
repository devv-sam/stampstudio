import { useDialKit } from "dialkit";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  DEFAULT_SHADER_PARAMS,
  defaultStampUrl,
} from "../../data/editorDefaults";
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
  { name: "paper-texture", label: "Paper" },
  { name: "water", label: "Water" },
  { name: "engraving", label: "Engraving" },
  { name: "riso", label: "Riso" },
];

export function ShaderRail() {
  const { blurPop, press, springy } = useDeskMotion();
  const { activeShader, setActiveShader } = useStampEditor();
  const rail = useDialKit(
    "Shader rail",
    {
      windowWidth: [75, 32, 140, 1],
      windowHeight: [62, 24, 120, 1],
      windowRadius: [12, 0, 32, 1],
      columns: [1, 1, 4, 1],
      gap: [7, 0, 32, 1],
      padding: [8, 0, 32, 1],
      cardRadius: [20, 0, 48, 1],
    },
    { id: "shader-rail-v2", persist: true },
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tip, setTip] = useState({
    name: null as ShaderName | null,
    label: "",
    y: 0,
    visible: false,
    snap: true,
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element;
      // ink color pickers portal to body but still belong to this menu
      if (rootRef.current?.contains(target) || target.closest(".chrome-picker")) {
        return;
      }
      setSettingsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [settingsOpen]);

  const showTip = (name: ShaderName, label: string, el: HTMLElement) => {
    setTip((t) => ({
      name,
      label,
      y: el.offsetTop + el.offsetHeight / 2,
      visible: true,
      snap: !t.visible,
    }));
  };

  const hideTip = () => setTip((t) => ({ ...t, visible: false }));

  // the open settings card sits where this thumb's label would land
  const tipShown =
    tip.visible && !(settingsOpen && tip.name === activeShader);

  const onThumb = (name: ShaderName) => {
    const turningOff = activeShader === name && settingsOpen;
    setActiveShader(turningOff ? null : name);
    setSettingsOpen(!turningOff);
  };

  return (
    <div ref={rootRef} className="pointer-events-auto relative">
      <div
        role="group"
        aria-label="Print effects"
        onPointerLeave={hideTip}
        onBlur={hideTip}
        className="desk-card grid w-max grid-cols-[repeat(var(--rail-columns),max-content)] max-md:grid-cols-3"
        style={
          {
            "--rail-columns": rail.columns,
            gap: rail.gap,
            padding: rail.padding,
            borderRadius: rail.cardRadius,
          } as CSSProperties
        }
      >
        {SHADERS.map(({ name, label }) => {
          const on = activeShader === name;
          return (
            <motion.button
              key={name}
              type="button"
              {...press}
              aria-label={label}
              onPointerEnter={(e) => showTip(name, label, e.currentTarget)}
              onFocus={(e) => showTip(name, label, e.currentTarget)}
              aria-pressed={on}
              onClick={() => onThumb(name)}
              className={`relative block cursor-pointer overflow-hidden bg-[#fff] ${
                on ? "outline-3 outline-offset-1 outline-cornflower" : ""
              }`}
              style={{
                width: rail.windowWidth,
                height: rail.windowHeight,
                borderRadius: rail.windowRadius,
              }}
            >
              <ShaderLayer
                rect={{
                  left: 0,
                  top: 0,
                  width: rail.windowWidth,
                  height: rail.windowHeight,
                }}
                imageSrc={defaultStampUrl}
                stampColor="#ffffff"
                activeShader={name}
                shaderParams={DEFAULT_SHADER_PARAMS}
              />
            </motion.button>
          );
        })}
      </div>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-0 left-full z-40 ml-2"
        initial={false}
        animate={{
          y: tip.y,
          opacity: tipShown ? 1 : 0,
          filter: tipShown ? "blur(0px)" : "blur(6px)",
        }}
        transition={{
          y: tip.snap ? { duration: 0 } : springy,
          opacity: { duration: 0.14 },
          filter: { duration: 0.18 },
        }}
      >
        <span className="desk-card block -translate-y-1/2 !rounded-xl px-2.5 py-1 text-sm whitespace-nowrap">
          {tip.label}
        </span>
      </motion.div>

      <AnimatePresence>
        {activeShader && settingsOpen ? (
          <motion.div
            key={activeShader}
            {...blurPop}
            className="desk-card absolute z-30 w-60 space-y-2 p-2 max-md:bottom-full max-md:left-0 max-md:mb-2 md:left-full md:top-0 md:ml-3"
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
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className="flex flex-wrap gap-1"
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

  if (shader === "paper-texture") {
    const p = shaderParams["paper-texture"];
    return (
      <>
        {(
          [
            ["folds", "Folds"],
            ["crumples", "Crumples"],
            ["roughness", "Roughness"],
          ] as const
        ).map(([param, label]) => (
          <PerforationSlider
            key={`paper-${param}-${p[param]}`}
            label={label}
            defaultValue={Math.round(p[param] * 100)}
            minValue={0}
            maxValue={100}
            onChange={(v) => updateShaderParam("paper-texture", param, v / 100)}
          />
        ))}
      </>
    );
  }

  if (shader === "water") {
    const p = shaderParams.water;
    return (
      <>
        {(
          [
            ["size", "Size"],
            ["waves", "Waves"],
            ["caustic", "Caustic"],
          ] as const
        ).map(([param, label]) => (
          <PerforationSlider
            key={`water-${param}-${p[param]}`}
            label={label}
            defaultValue={Math.round(p[param] * 100)}
            minValue={0}
            maxValue={100}
            onChange={(v) => updateShaderParam("water", param, v / 100)}
          />
        ))}
      </>
    );
  }

  if (shader === "engraving") {
    const p = shaderParams.engraving;
    return (
      <>
        <PerforationSlider
          key={`engrave-size-${p.size}`}
          label="Line spacing"
          defaultValue={p.size}
          minValue={2}
          maxValue={16}
          onChange={(v) => updateShaderParam("engraving", "size", v)}
        />
        <PerforationSlider
          key={`engrave-angle-${p.angle}`}
          label="Angle"
          defaultValue={p.angle}
          minValue={0}
          maxValue={180}
          format={(v) => `${v}°`}
          onChange={(v) => updateShaderParam("engraving", "angle", v)}
        />
      </>
    );
  }

  if (shader === "riso") {
    const p = shaderParams.riso;
    return (
      <>
        <PerforationSlider
          key={`riso-size-${p.size}`}
          label="Grain"
          defaultValue={Math.round(p.size * 10)}
          minValue={10}
          maxValue={60}
          onChange={(v) => updateShaderParam("riso", "size", v / 10)}
        />
        <PerforationSlider
          key={`riso-offset-${p.offset}`}
          label="Misprint"
          defaultValue={Math.round(p.offset * 1000)}
          minValue={0}
          maxValue={30}
          onChange={(v) => updateShaderParam("riso", "offset", v / 1000)}
        />
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
