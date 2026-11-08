import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Image as ImageIcon,
  Trash2,
  Type,
  X,
  type LucideIcon,
} from "lucide-react";

import { DEFAULT_SHADER_PARAMS } from "../../data/editorDefaults";
import { useExperiments } from "../../hooks/useExperiments";
import type { DitheringPresetName } from "../../types/canvas";
import { STAMP_FONTS } from "../../types/text";
import {
  discGeometry,
  SLOT_DEFAULTS,
  SLOT_ORDER,
  type DiscTextItem,
} from "../../utils/discText";
import { colorResultToHex } from "../../utils/colorResultToHex";
import { useDeskMotion } from "../../utils/deskMotion";
import { ColorRow, Section } from "../Desk/StampInspector";
import { StampColorPicker } from "../Desk/StampColorPicker";
import { useDismissOnOutside } from "../Panels/ActiveTextTypography";
import { ShaderLayer } from "../Canvas/ShaderLayer";
import { CropStep } from "../Upload/CropStep";
import { PerforationSlider } from "../UI/PerforationSlider";
import { Select } from "../UI/Select";
import { DiscText } from "./DiscText";

const FIELD =
  "h-10 w-full rounded-xl bg-zinc-900 px-3 text-sm outline-none transition-colors focus:bg-zinc-800";

const nearestWeight = (weights: number[], target: number) =>
  weights.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));

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
  // which color the shared picker edits
  const [pickerFor, setPickerFor] = useState<"disc" | "text">("disc");
  const [texts, setTexts] = useState<DiscTextItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = texts.find((t) => t.id === selectedId) ?? null;
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

  const updateSelected = (patch: Partial<DiscTextItem>) =>
    setTexts((all) =>
      all.map((t) => (t.id === selectedId ? { ...t, ...patch } : t)),
    );

  const removeSelected = () => {
    setTexts((all) => all.filter((t) => t.id !== selectedId));
    setSelectedId(null);
  };

  const togglePicker = (target: "disc" | "text") => {
    setPickerOpen((o) => !(o && pickerFor === target));
    setPickerFor(target);
  };

  // straight slots fill first, then extras stack on the rim
  const addText = () => {
    const taken = new Set(texts.map((t) => t.slot));
    const slot = SLOT_ORDER.find((s) => !taken.has(s)) ?? "rim";
    const defaults = SLOT_DEFAULTS[slot];
    const id = crypto.randomUUID();
    setTexts((all) => [
      ...all,
      {
        id,
        slot,
        content: defaults.content,
        angle: defaults.angle,
        fontSize: defaults.fontSize,
        fontFamily: "Inter",
        fontWeight: slot === "top" ? 600 : 500,
        color: "#ffffff",
      },
    ]);
    setSelectedId(id);
  };

  // delete or backspace removes the selected text, unless you're typing
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select")) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        setTexts((all) => all.filter((t) => t.id !== selectedId));
        setSelectedId(null);
      }
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

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
      <main
        className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-6"
        onPointerDown={() => setSelectedId(null)}
      >
        <div
          ref={discRef}
          className="aspect-square drop-shadow-[0_10px_24px_rgb(0_0_0/0.18)]"
          style={{ width: `min(${size}px, 70vmin)` }}
        >
          <div
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
            <DiscText
              items={texts}
              onItemsChange={setTexts}
              selectedId={selectedId}
              onSelect={setSelectedId}
              geometry={discGeometry(hole, rings, spread)}
            />
          </div>
        </div>
      </main>

      <div
        ref={panelRef}
        className="relative z-10 self-center md:mr-6 max-md:mb-24 max-md:w-[calc(100%-1.5rem)]"
      >
        <div className="desk-card w-[212px] space-y-3 p-1.5 max-md:w-auto">
          {selected ? (
            <Section title="Text">
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  <input
                    aria-label="Text"
                    value={selected.content}
                    onChange={(e) => updateSelected({ content: e.target.value })}
                    className={FIELD}
                  />
                  <button
                    type="button"
                    onClick={removeSelected}
                    title="Remove text"
                    aria-label="Remove text"
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-zinc-900 hover:text-poppy"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
                <Select
                  aria-label="Font"
                  value={selected.fontFamily}
                  onChange={(e) => {
                    const font = STAMP_FONTS.find(
                      (f) => f.family === e.target.value,
                    );
                    if (!font) return;
                    updateSelected({
                      fontFamily: font.family,
                      fontWeight: nearestWeight(
                        font.weights,
                        selected.fontWeight,
                      ),
                    });
                  }}
                  className="!h-10 w-full !rounded-xl !border-0 !bg-zinc-900 !font-normal"
                >
                  {STAMP_FONTS.map((f) => (
                    <option key={f.family} value={f.family}>
                      {f.label}
                    </option>
                  ))}
                </Select>
                <PerforationSlider
                  key={selected.id}
                  label="Size"
                  defaultValue={selected.fontSize}
                  minValue={1.5}
                  maxValue={10}
                  step={0.1}
                  onInput={(fontSize) => updateSelected({ fontSize })}
                  format={(v) => v.toFixed(1)}
                />
                <ColorRow
                  color={selected.color}
                  open={pickerOpen && pickerFor === "text"}
                  onToggle={() => togglePicker("text")}
                  onChange={(c) => updateSelected({ color: c })}
                />
              </div>
            </Section>
          ) : null}

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
              open={pickerOpen && pickerFor === "disc"}
              onToggle={() => togglePicker("disc")}
              onChange={pickColor}
            />
          </Section>
        </div>

        <AnimatePresence>
          {pickerOpen && (pickerFor === "disc" || selected) ? (
            <motion.div
              key={pickerFor}
              role="dialog"
              aria-label={pickerFor === "text" ? "Text color" : "Disc color"}
              {...blurPop}
              className="desk-card absolute top-0 z-30 w-60 p-1.5 max-md:bottom-full max-md:right-0 max-md:top-auto max-md:mb-2 md:right-full md:mr-2"
            >
              <StampColorPicker
                color={pickerFor === "text" && selected ? selected.color : color}
                onChange={(result) => {
                  const hex = colorResultToHex(result);
                  if (pickerFor === "text") updateSelected({ color: hex });
                  else pickColor(hex);
                }}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="desk-card absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 p-1.5">
        <BarButton label="Back to studio" icon={ArrowLeft} onClick={exit} />
        <BarButton label="Add text" icon={Type} onClick={addText} />
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
