import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Rotate3d, X } from "lucide-react";
import { useCallback, useState } from "react";

import { useDeskMotion } from "../../utils/deskMotion";
import { Button } from "../UI/Button";
import { colorResultToHex } from "../../utils/colorResultToHex";
import { StampColorPicker } from "../Desk/StampColorPicker";
import { useDismissOnOutside } from "../Panels/ActiveTextTypography";
import { IMAGE_SWATCH } from "./DiscInspector";

export const DESK_BG = "#f1f1f1";
const PREVIEW_BACKGROUNDS = [DESK_BG, "#ffffff", "#0e0e10"];

export function DiscPreviewBar({
  view3d,
  onView3d,
  playing,
  onPlaying,
  background,
  onBackground,
  onDone,
}: {
  view3d: boolean;
  onView3d: (on: boolean) => void;
  playing: boolean;
  onPlaying: (on: boolean) => void;
  background: string;
  onBackground: (hex: string) => void;
  onDone: () => void;
}) {
  const { blurPop } = useDeskMotion();
  const [pickerOpen, setPickerOpen] = useState(false);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const rootRef = useDismissOnOutside<HTMLDivElement>(pickerOpen, closePicker);
  const custom = !PREVIEW_BACKGROUNDS.includes(background);
  const ring = "outline-2 outline-offset-2 outline-cornflower";

  return (
    <motion.div
      ref={rootRef}
      {...blurPop}
      data-preview-bar
      className="desk-card fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 p-1"
    >
      <Button
        variant="ghost"
        aria-label={playing ? "Stop spinning" : "Spin slowly"}
        aria-pressed={playing}
        className="w-10 !px-0"
        onClick={() => onPlaying(!playing)}
      >
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </Button>
      <Button
        variant="ghost"
        aria-label="3D view"
        aria-pressed={view3d}
        className={`w-10 !px-0 ${view3d ? "!text-cornflower" : ""}`}
        onClick={() => onView3d(!view3d)}
      >
        <Rotate3d size={18} />
      </Button>

      <span aria-hidden className="mx-1 h-5 w-px bg-zinc-700" />
      <div role="group" aria-label="Background" className="flex gap-2 px-1">
        {PREVIEW_BACKGROUNDS.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={`Background ${hex}`}
            aria-pressed={background === hex}
            onClick={() => onBackground(hex)}
            className={`h-6 w-6 cursor-pointer rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] ${
              background === hex ? ring : ""
            }`}
            style={{ background: hex }}
          />
        ))}
        <button
          type="button"
          aria-label="Pick a background color"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((o) => !o)}
          className={`h-6 w-6 cursor-pointer rounded-full ${custom ? ring : ""}`}
          style={{ background: custom ? background : IMAGE_SWATCH }}
        />
      </div>
      <span aria-hidden className="mx-1 h-5 w-px bg-zinc-700" />

      <Button
        variant="ghost"
        aria-label="Exit preview"
        className="w-10 !px-0"
        onClick={onDone}
      >
        <X size={18} />
      </Button>

      <AnimatePresence>
        {pickerOpen ? (
          <motion.div
            role="dialog"
            aria-label="Background color"
            {...blurPop}
            className="desk-card absolute bottom-full right-0 mb-2 w-60 p-1.5"
          >
            <StampColorPicker
              color={background}
              onChange={(result) => onBackground(colorResultToHex(result))}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
