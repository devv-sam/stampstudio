import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Image as ImageIcon,
  X,
  type LucideIcon,
} from "lucide-react";

import { DEFAULT_SHADER_PARAMS } from "../../data/editorDefaults";
import { useExperiments } from "../../hooks/useExperiments";
import type { DitheringPresetName } from "../../types/canvas";
import { colorResultToHex } from "../../utils/colorResultToHex";
import { useDeskMotion } from "../../utils/deskMotion";
import { ColorRow, Section } from "../Desk/StampInspector";
import { StampColorPicker } from "../Desk/StampColorPicker";
import { useDismissOnOutside } from "../Panels/ActiveTextTypography";
import { ShaderLayer } from "../Canvas/ShaderLayer";
import { CropStep } from "../Upload/CropStep";
import { PerforationSlider } from "../UI/PerforationSlider";

const IMAGE_SWATCH =
  "conic-gradient(#ff271f, #ffe122, #00cc55, #3b84ee, #ff31c6, #ff271f)";

// both are the stamp's dithering shader with a different preset
const SHADERS: {
  id: string;
  label: string;
  preset: DitheringPresetName | null;
}[] = [
  { id: "none", label: "None", preset: null },
  { id: "dither", label: "Dither", preset: "natural" },
  { id: "noise", label: "Noise", preset: "noise" },
];

function BarButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  const { press } = useDeskMotion();
  return (
    <motion.button
      type="button"
      {...press}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-[35px] w-[35px] cursor-pointer items-center justify-center rounded-md"
    >
      <Icon size={20} strokeWidth={1.75} aria-hidden />
    </motion.button>
  );
}

export function CdExperiment() {
  const { exit } = useExperiments();
  const { blurPop, springy } = useDeskMotion();

  const [size, setSize] = useState(420);
  // hole diameter as a % of the disc diameter
  const [hole, setHole] = useState(30);
  const [color, setColor] = useState("#3b84ee");
  // image or color, never both: picking a color drops the image
  const [image, setImage] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // the raw upload waiting in the crop step
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [shader, setShader] = useState(SHADERS[0]!);
  const [grain, setGrain] = useState(2);
  const [rings, setRings] = useState(3);
  // gap between rings, in % of the disc diameter
  const [spread, setSpread] = useState(3);

  const discRef = useRef<HTMLDivElement>(null);
  const [discPx, setDiscPx] = useState(0);
  useLayoutEffect(() => {
    const el = discRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setDiscPx(el.offsetWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fileRef = useRef<HTMLInputElement>(null);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const panelRef = useDismissOnOutside<HTMLDivElement>(pickerOpen, closePicker);

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const openFile = () => fileRef.current?.click();

  const pickColor = (next: string) => {
    setImage(null);
    setColor(next);
  };

  const holeStop = `${hole}%`;
  // svg units are % of the diameter, so the hole radius is hole / 2
  const ringRadii = Array.from(
    { length: rings },
    (_, i) => hole / 2 + spread * (i + 1),
  ).filter((r) => r < 49);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex bg-desk text-ink max-md:flex-col"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <main className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-6">
        <div
          ref={discRef}
          className="aspect-square drop-shadow-[0_10px_24px_rgb(0_0_0/0.18)]"
          style={{ width: `min(${size}px, 70vmin)` }}
        >
          <div
            role="img"
            aria-label="Disc preview"
            className="relative h-full w-full overflow-hidden rounded-full"
            style={{
              // closest-side makes 100% the disc radius, so hole% is a diameter ratio
              mask: `radial-gradient(circle closest-side, transparent ${holeStop}, #000 calc(${holeStop} + 0.5px))`,
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundColor: color,
                backgroundImage: image ? `url(${image})` : undefined,
              }}
            />
            <ShaderLayer
              rect={{ left: 0, top: 0, width: discPx, height: discPx }}
              imageSrc={image ?? ""}
              stampColor={color}
              activeShader={shader.preset ? "image-dithering" : null}
              shaderParams={{
                ...DEFAULT_SHADER_PARAMS,
                "image-dithering": {
                  preset: shader.preset ?? "natural",
                  size: grain,
                },
              }}
            />
            <svg
              aria-hidden
              viewBox="0 0 100 100"
              className="pointer-events-none absolute inset-0 z-40 h-full w-full"
            >
              {ringRadii.map((r) => (
                <g key={r} fill="none">
                  {/* a dark groove with a faint lit edge just outside it */}
                  <circle
                    cx={50}
                    cy={50}
                    r={r}
                    stroke="rgb(0 0 0 / 0.35)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={50}
                    cy={50}
                    r={r + 0.25}
                    stroke="rgb(255 255 255 / 0.12)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ))}
            </svg>
          </div>
        </div>
      </main>

      <div
        ref={panelRef}
        className="relative z-10 self-center md:mr-6 max-md:mb-24 max-md:w-[calc(100%-1.5rem)]"
      >
        <div className="desk-card w-[212px] space-y-3 p-1.5 max-md:w-auto">
          <Section title="Disc">
            <div className="space-y-1.5">
              <PerforationSlider
                label="Size"
                defaultValue={size}
                minValue={200}
                maxValue={560}
                step={4}
                onInput={setSize}
                format={(v) => `${v}px`}
              />
              <PerforationSlider
                label="Cutout"
                defaultValue={hole}
                minValue={8}
                maxValue={60}
                snaps={[12.5, 30]}
                step={0.5}
                onInput={setHole}
                format={(v) => `${Math.round(v)}%`}
              />
              <PerforationSlider
                label="Rings"
                defaultValue={rings}
                minValue={0}
                maxValue={5}
                onInput={setRings}
                format={(v) => (v === 0 ? "Off" : String(v))}
              />
              {rings > 0 ? (
                <PerforationSlider
                  label="Spread"
                  defaultValue={spread}
                  minValue={1}
                  maxValue={8}
                  step={0.5}
                  onInput={setSpread}
                  format={(v) => `${v}%`}
                />
              ) : null}
            </div>
          </Section>

          <Section title="Shader">
            <div className="space-y-1.5">
              <div
                role="radiogroup"
                aria-label="Shader"
                className="flex gap-0.5 rounded-xl bg-zinc-900 p-0.5"
              >
                {SHADERS.map((option) => {
                  const active = shader.id === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setShader(option)}
                      className="relative flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-lg text-sm"
                    >
                      {active ? (
                        <motion.span
                          layoutId="cd-shader-pill"
                          transition={springy}
                          className="absolute inset-0 rounded-lg bg-card shadow-sm"
                        />
                      ) : null}
                      <span className="relative">{option.label}</span>
                    </button>
                  );
                })}
              </div>
              {shader.preset ? (
                <PerforationSlider
                  label="Grain"
                  defaultValue={grain}
                  minValue={1}
                  maxValue={8}
                  onInput={setGrain}
                />
              ) : null}
            </div>
          </Section>

          <Section title="Color">
            <ColorRow
              color={color}
              swatch={image ? IMAGE_SWATCH : color}
              open={pickerOpen}
              onToggle={() => setPickerOpen((o) => !o)}
              onChange={pickColor}
            />
          </Section>
        </div>

        <AnimatePresence>
          {pickerOpen ? (
            <motion.div
              role="dialog"
              aria-label="Disc color"
              {...blurPop}
              className="desk-card absolute top-0 z-30 w-60 p-1.5 max-md:bottom-full max-md:right-0 max-md:top-auto max-md:mb-2 md:right-full md:mr-2"
            >
              <StampColorPicker
                color={color}
                onChange={(result) => pickColor(colorResultToHex(result))}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="desk-card absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 p-1.5">
        <BarButton label="Back to studio" icon={ArrowLeft} onClick={exit} />
        <BarButton label="Upload image" icon={ImageIcon} onClick={openFile} />
        {image ? (
          <BarButton
            label="Remove image"
            icon={X}
            onClick={() => setImage(null)}
          />
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) setCropSrc(URL.createObjectURL(file));
          }}
        />
      </div>

      {cropSrc ? (
        <CropStep
          round
          src={cropSrc}
          confirmLabel="Use image"
          onCancel={closeCrop}
          onConfirm={(dataUrl) => {
            setImage(dataUrl);
            closeCrop();
          }}
        />
      ) : null}
    </motion.div>
  );
}
