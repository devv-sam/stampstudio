import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useStampEditor } from "../../hooks/useStampEditor";
import { useDeskMotion } from "../../utils/deskMotion";
import { buildPerforationClipPathD } from "../../utils/stampPerforationLayout";
import {
  STAMP_SNAP_PRESETS,
  type StampSnapPreset,
} from "../../utils/stampSnapSizes";

const CARD_TILT = [-3, 5, -7];

const RESIZE_WARNING =
  "You have text or frame images on this stamp. Changing size may shift their layout. Continue?";

function orientation({ w, h }: StampSnapPreset) {
  if (w === h) return "Square";
  return w > h ? "Landscape" : "Portrait";
}

function matches(p: StampSnapPreset, d: { width: number; height: number }) {
  return Math.abs(d.width - p.w) <= 1 && Math.abs(d.height - p.h) <= 1;
}

function MiniStamp({ preset }: { preset: StampSnapPreset }) {
  const { stampColor, backgroundAsset } = useStampEditor();
  const longEdge = 76 + 52 * (Math.max(preset.w, preset.h) / 420);
  const s = longEdge / Math.max(preset.w, preset.h);
  const w = Math.round(preset.w * s);
  const h = Math.round(preset.h * s);

  return (
    <span
      className="block drop-shadow-[0_3px_6px_rgb(0_0_0/0.18)]"
      style={{ width: w, height: h }}
    >
      <span
        className="block h-full w-full overflow-hidden"
        style={{
          background: stampColor,
          clipPath: `path(evenodd, "${buildPerforationClipPathD(w, h, 10)}")`,
        }}
      >
        {backgroundAsset ? (
          <img
            src={backgroundAsset.src}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
      </span>
    </span>
  );
}

export function PresetStack() {
  const { press, springy } = useDeskMotion();
  const { stampDimensions, textLayers, frameAssets, applyStampSizePreset } =
    useStampEditor();
  const count = STAMP_SNAP_PRESETS.length;
  const [index, setIndex] = useState(count - 5);

  const top = STAMP_SNAP_PRESETS[index]!;
  const inUse = matches(top, stampDimensions);

  const flip = (by: number) => setIndex((i) => (i + by + count) % count);

  const apply = () => {
    if (inUse) return;
    if (
      (textLayers.length > 0 || frameAssets.length > 0) &&
      !window.confirm(RESIZE_WARNING)
    ) {
      return;
    }
    applyStampSizePreset(top.w, top.h);
  };

  return (
    <div
      role="group"
      aria-label="Size presets"
      className="pointer-events-auto flex w-44 flex-col items-center gap-2 text-ink max-md:w-32"
    >
      <div className="relative h-40 w-full max-md:h-28 max-md:scale-75">
        <AnimatePresence initial={false}>
          {[2, 1, 0].map((depth) => {
            const preset = STAMP_SNAP_PRESETS[(index + depth) % count]!;
            return (
              <motion.button
                key={`${preset.w}-${preset.h}`}
                type="button"
                disabled={depth > 0}
                aria-hidden={depth > 0}
                aria-label={`Use ${preset.w} by ${preset.h}`}
                onClick={apply}
                initial={{ opacity: 0, scale: 0.8, filter: "blur(8px)" }}
                animate={{
                  opacity: 1,
                  filter: "blur(0px)",
                  rotate: CARD_TILT[depth],
                  x: depth * 12,
                  y: depth * -10,
                  scale: 1 - depth * 0.08,
                }}
                exit={{ opacity: 0, x: -120, rotate: -24, filter: "blur(8px)" }}
                whileHover={depth === 0 ? { rotate: 0 } : undefined}
                whileTap={depth === 0 ? { scale: 0.94 } : undefined}
                transition={{ ...springy, filter: { duration: 0.22 } }}
                style={{ zIndex: 3 - depth }}
                className={`absolute inset-0 flex items-center justify-center ${
                  depth === 0 ? "cursor-pointer" : ""
                }`}
              >
                <MiniStamp preset={preset} />
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1">
        <motion.button
          type="button"
          {...press}
          aria-label="Previous size"
          onClick={() => flip(-1)}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-buttercup text-ink"
        >
          <ChevronLeft size={18} aria-hidden />
        </motion.button>
        <p className="min-w-0 flex-1 text-center text-sm leading-tight">
          {orientation(top)}
          <span className="block tabular-nums text-ink-soft">
            {top.w} × {top.h}
          </span>
        </p>
        <motion.button
          type="button"
          {...press}
          aria-label="Next size"
          onClick={() => flip(1)}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-buttercup text-ink"
        >
          <ChevronRight size={18} aria-hidden />
        </motion.button>
      </div>
    </div>
  );
}
