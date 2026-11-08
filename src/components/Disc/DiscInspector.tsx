import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";

import { useDiscEditor } from "../../hooks/useDiscEditor";
import { STAMP_FONTS } from "../../types/text";
import { colorResultToHex } from "../../utils/colorResultToHex";
import { useDeskMotion } from "../../utils/deskMotion";
import { ColorRow, Section } from "../Desk/StampInspector";
import { StampColorPicker } from "../Desk/StampColorPicker";
import { useDismissOnOutside } from "../Panels/ActiveTextTypography";
import { PerforationSlider } from "../UI/PerforationSlider";
import { Select } from "../UI/Select";

const FIELD =
  "h-10 w-full rounded-xl bg-zinc-900 px-3 text-sm outline-none transition-colors focus:bg-zinc-800";

const IMAGE_SWATCH =
  "conic-gradient(#ff271f, #ffe122, #00cc55, #3b84ee, #ff31c6, #ff271f)";

const nearestWeight = (weights: number[], target: number) =>
  weights.reduce((a, b) =>
    Math.abs(b - target) < Math.abs(a - target) ? b : a,
  );

/** right-hand panel in disc mode */
export function DiscInspector() {
  const {
    size,
    setSize,
    hole,
    setHole,
    rings,
    setRings,
    spread,
    setSpread,
    color,
    image,
    pickColor,
    texts,
    selectedId,
    updateSelected,
    removeSelected,
  } = useDiscEditor();
  const { blurPop } = useDeskMotion();
  const selected = texts.find((t) => t.id === selectedId) ?? null;

  const [pickerOpen, setPickerOpen] = useState(false);
  // which color the shared picker edits
  const [pickerFor, setPickerFor] = useState<"disc" | "text">("disc");
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const rootRef = useDismissOnOutside<HTMLDivElement>(pickerOpen, closePicker);

  const togglePicker = (target: "disc" | "text") => {
    setPickerOpen((o) => !(o && pickerFor === target));
    setPickerFor(target);
  };

  return (
    <div ref={rootRef} className="pointer-events-auto relative">
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
                    fontWeight: nearestWeight(font.weights, selected.fontWeight),
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
              snaps={[12.5, 20, 30]}
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
  );
}
