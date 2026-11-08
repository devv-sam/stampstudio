import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useDiscEditor } from "../../hooks/useDiscEditor";
import { colorResultToHex } from "../../utils/colorResultToHex";
import { useDeskMotion } from "../../utils/deskMotion";
import { DISC_TEXT_SIZES } from "../../utils/discText";
import { SidebarMorph } from "../Desk/SidebarMorph";
import { ColorRow, Section } from "../Desk/StampInspector";
import { StampColorPicker } from "../Desk/StampColorPicker";
import {
  TypographyPanel,
  useDismissOnOutside,
} from "../Panels/ActiveTextTypography";
import { PerforationSlider } from "../UI/PerforationSlider";

const FIELD =
  "h-10 w-full rounded-xl bg-zinc-900 px-3 text-sm outline-none transition-colors focus:bg-zinc-800";

const IMAGE_SWATCH =
  "conic-gradient(#ff271f, #ffe122, #00cc55, #3b84ee, #ff31c6, #ff271f)";

/** right-hand panel in disc mode: disc controls, or only the text's when one is selected */
export function DiscInspector() {
  const {
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
  const current = texts.find((t) => t.id === selectedId) ?? null;

  // keeps the text field filled while the card crossfades away after a deselect
  const [lastText, setLastText] = useState(current);
  if (current && current !== lastText) setLastText(current);
  const shownText = current ?? lastText;

  const [pickerOpen, setPickerOpen] = useState(false);
  // which color the shared picker edits
  const [pickerFor, setPickerFor] = useState<"disc" | "text">("disc");
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const rootRef = useDismissOnOutside<HTMLDivElement>(pickerOpen, closePicker);

  // the card swaps views, so a picker left open would point at the wrong color
  const [pickerView, setPickerView] = useState(!!current);
  if (pickerView !== !!current) {
    setPickerView(!!current);
    setPickerOpen(false);
  }

  const togglePicker = (target: "disc" | "text") => {
    setPickerOpen((o) => !(o && pickerFor === target));
    setPickerFor(target);
  };

  return (
    <div ref={rootRef} className="pointer-events-auto relative">
      <SidebarMorph
        showAlt={!!current}
        mainClassName="space-y-3 max-md:space-y-1.5"
        alt={
          <TypographyPanel
            layer={current}
            onChange={updateSelected}
            onRemove={removeSelected}
            sizes={DISC_TEXT_SIZES}
            minSize={4}
            maxSize={48}
            extra={
              shownText ? (
                <input
                  aria-label="Text"
                  value={shownText.content}
                  onChange={(e) => updateSelected({ content: e.target.value })}
                  className={FIELD}
                />
              ) : null
            }
            renderColor={(textColor, setTextColor) => (
              <ColorRow
                color={textColor}
                open={pickerOpen && pickerFor === "text"}
                onToggle={() => togglePicker("text")}
                onChange={setTextColor}
              />
            )}
          />
        }
      >
        <Section title="Disc">
          <div className="space-y-1.5">
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
      </SidebarMorph>

      <AnimatePresence>
        {pickerOpen && (pickerFor === "disc" || current) ? (
          <motion.div
            key={pickerFor}
            role="dialog"
            aria-label={pickerFor === "text" ? "Text color" : "Disc color"}
            {...blurPop}
            className="desk-card absolute top-0 z-30 w-60 p-1.5 max-md:bottom-full max-md:right-0 max-md:top-auto max-md:mb-2 md:right-full md:mr-2"
          >
            <StampColorPicker
              color={pickerFor === "text" && current ? current.color : color}
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
