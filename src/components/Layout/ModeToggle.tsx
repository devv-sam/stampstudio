import { motion } from "framer-motion";
import { Disc3 } from "lucide-react";
import type { ComponentType } from "react";

import { useDiscEditor } from "../../hooks/useDiscEditor";
import { useStampEditor } from "../../hooks/useStampEditor";
import { useDeskMotion } from "../../utils/deskMotion";
import { LogoMark } from "../Brand/LogoMark";

type Mode = {
  id: "stamp" | "disc";
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** the pill takes this brand color while the mode is on */
  color: string;
  /** a little move the icon does when its mode turns on */
  flourish: { rotate?: number[]; y?: number[]; scale?: number[] };
};

const MODES: Mode[] = [
  {
    id: "stamp",
    label: "Stamp",
    // the brand mark, a perforated stamp outline
    icon: LogoMark,
    color: "#00cc55", // clover, as hex so the pill can tween between modes
    // a press: down onto the paper and back up
    flourish: { y: [0, 3, 0], scale: [1, 0.86, 1] },
  },
  {
    id: "disc",
    label: "Disc",
    // disc-3 has grooves, so the spin reads
    icon: Disc3,
    color: "#3b84ee", // cornflower
    flourish: { rotate: [0, 360] },
  },
];

/** switches the desk between stamp and disc design */
export function ModeToggle() {
  const { discMode, setDiscMode } = useDiscEditor();
  const { setTextPlacementActive } = useStampEditor();
  const { springy } = useDeskMotion();
  const active = discMode ? "disc" : "stamp";

  return (
    <div
      role="radiogroup"
      aria-label="Design mode"
      className="desk-card flex gap-0.5 !rounded-xl p-1"
    >
      {MODES.map(({ id, label, icon: Icon, color, flourish }) => {
        const on = active === id;
        const otherColor = MODES.find((m) => m.id !== id)!.color;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              if (on) return;
              setTextPlacementActive(false);
              setDiscMode(id === "disc");
            }}
            className={`relative flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm transition-colors ${
              on ? "text-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            {on ? (
              <motion.span
                layoutId="mode-toggle-pill"
                transition={springy}
                className="absolute inset-0 rounded-lg"
                // fades from the other mode's color while it slides over
                initial={{ backgroundColor: otherColor }}
                animate={{ backgroundColor: color }}
              />
            ) : null}
            {/* remounts on activation so the move plays once, forward only */}
            <motion.span
              key={on ? "on" : "off"}
              className="relative flex"
              animate={on ? flourish : undefined}
              transition={{ duration: id === "disc" ? 0.6 : 0.3, ease: "easeOut" }}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </motion.span>
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
