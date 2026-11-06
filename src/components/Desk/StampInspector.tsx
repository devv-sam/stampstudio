import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useStampEditor } from "../../hooks/useStampEditor";
import {
  colorResultToHex,
  joinHexAlpha,
  splitHexAlpha,
} from "../../utils/colorResultToHex";
import { useDeskMotion } from "../../utils/deskMotion";
import { StampColorPicker } from "./StampColorPicker";

const field =
  "flex h-10 min-w-0 items-center gap-2 rounded-xl bg-zinc-900 px-3 text-sm transition-colors focus-within:bg-zinc-800";

function CommitInput({
  value,
  label,
  onCommit,
}: {
  value: string;
  label: string;
  onCommit: (raw: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      type="text"
      aria-label={label}
      spellCheck={false}
      value={draft ?? value}
      onFocus={(e) => {
        setDraft(value);
        e.currentTarget.select();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null && draft !== value) onCommit(draft.trim());
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(value);
          requestAnimationFrame(() => e.currentTarget?.blur());
        }
      }}
      className="w-full min-w-0 bg-transparent tabular-nums outline-none"
    />
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="px-1 pt-1 text-sm text-ink-soft">{title}</h2>
      {children}
    </section>
  );
}

export function StampInspector() {
  const {
    stampDimensions,
    setStampSize,
    stampColor,
    pickSolidStampColor,
    backgroundAsset,
  } = useStampEditor();
  const { blurPop, press } = useDeskMotion();
  const [pickerOpen, setPickerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const { hex, opacity } = splitHexAlpha(stampColor);

  const commitSize = (raw: string, axis: "width" | "height") => {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    setStampSize(
      axis === "width" ? n : stampDimensions.width,
      axis === "height" ? n : stampDimensions.height,
    );
  };

  const commitHex = (raw: string) => {
    const next = raw.replace("#", "");
    if (/^[0-9a-f]{6}$/i.test(next)) {
      void pickSolidStampColor(joinHexAlpha(next, opacity));
    }
  };

  const commitOpacity = (raw: string) => {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    const next = Math.min(100, Math.max(0, n));
    void pickSolidStampColor(joinHexAlpha(hex, next));
  };

  return (
    <div ref={rootRef} className="pointer-events-auto relative">
      <div className="desk-card w-56 space-y-3 p-1.5 max-md:w-40">
        <Section title="Canvas">
          <div className="grid grid-cols-2 gap-1.5 max-md:grid-cols-1">
            <label className={field}>
              <span className="text-ink-soft">W</span>
              <CommitInput
                label="Canvas width"
                value={String(stampDimensions.width)}
                onCommit={(raw) => commitSize(raw, "width")}
              />
            </label>
            <label className={field}>
              <span className="text-ink-soft">H</span>
              <CommitInput
                label="Canvas height"
                value={String(stampDimensions.height)}
                onCommit={(raw) => commitSize(raw, "height")}
              />
            </label>
          </div>
        </Section>

        <Section title="Color">
          <div className="flex gap-1.5">
            <motion.button
              type="button"
              {...press}
              aria-label="Open color picker"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((o) => !o)}
              className="h-10 w-10 shrink-0 cursor-pointer rounded-xl shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]"
              style={{
                background: backgroundAsset
                  ? "conic-gradient(#ff271f, #ffe122, #00cc55, #3b84ee, #ff31c6, #ff271f)"
                  : stampColor,
              }}
            />
            <div className={`${field} flex-1`}>
              <CommitInput label="Hex color" value={hex} onCommit={commitHex} />
              <span aria-hidden className="h-5 w-px shrink-0 bg-zinc-700" />
              <label className="flex w-12 shrink-0 items-center gap-1">
                <CommitInput
                  label="Opacity"
                  value={String(opacity)}
                  onCommit={commitOpacity}
                />
                <span className="text-ink-soft">%</span>
              </label>
            </div>
          </div>
        </Section>
      </div>

      <AnimatePresence>
        {pickerOpen ? (
          <motion.div
            role="dialog"
            aria-label="Stamp color"
            {...blurPop}
            className="desk-card absolute top-0 z-30 w-60 p-1.5 max-md:bottom-full max-md:right-0 max-md:top-auto max-md:mb-2 md:right-full md:mr-2"
          >
            <StampColorPicker
              color={stampColor}
              onChange={(result) =>
                void pickSolidStampColor(colorResultToHex(result))
              }
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
