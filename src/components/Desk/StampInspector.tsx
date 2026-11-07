import { useDialKit } from "dialkit";
import { AnimatePresence, motion } from "framer-motion";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useStampEditor } from "../../hooks/useStampEditor";
import {
  colorResultToHex,
  joinHexAlpha,
  splitHexAlpha,
} from "../../utils/colorResultToHex";
import {
  toTransition,
  useDeskMotion,
} from "../../utils/deskMotion";
import { ActiveTextTypography } from "../Panels/ActiveTextTypography";
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
    selectedTextId,
    textPlacementActive,
  } = useStampEditor();
  const { blurPop, press } = useDeskMotion();
  const textActive = !!selectedTextId && !textPlacementActive;

  const morph = useDialKit(
    "Sidebar morph",
    {
      height: { type: "spring", visualDuration: 0.3, bounce: 0.1 },
      fadeDuration: [0.2, 0.02, 0.6, 0.01],
      blur: [6, 0, 24, 1],
      slide: [0, -24, 24, 1],
      scale: [0.98, 0.85, 1, 0.01],
    },
    { id: "sidebar-morph-v2", persist: true },
  );

  const hidden = {
    opacity: 0,
    y: morph.slide,
    scale: morph.scale,
    filter: `blur(${morph.blur}px)`,
  };
  const fade = {
    initial: hidden,
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    exit: hidden,
    transition: { duration: morph.fadeDuration },
  };

  const stampViewRef = useRef<HTMLDivElement>(null);
  const textViewRef = useRef<HTMLDivElement>(null);
  const [measure, setMeasure] = useState({ height: 0, first: true });
  const [morphing, setMorphing] = useState(false);

  // both views overlap while crossfading, so the card follows only the incoming one
  useLayoutEffect(() => {
    const el = (textActive ? textViewRef : stampViewRef).current;
    if (!el) return;
    const read = () =>
      setMeasure((m) => ({
        height: el.offsetHeight,
        first: m.first && m.height === 0,
      }));
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [textActive]);
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
    <div
      ref={rootRef}
      data-text-panel
      className="pointer-events-auto relative"
    >
      <motion.div
        className={`desk-card box-content w-[212px] p-1.5 max-md:w-[148px] ${
          morphing ? "overflow-hidden" : ""
        }`}
        initial={false}
        animate={{ height: measure.height }}
        transition={measure.first ? { duration: 0 } : toTransition(morph.height)}
        onAnimationStart={() => setMorphing(true)}
        onAnimationComplete={() => setMorphing(false)}
      >
        <div className="relative h-full">
          <AnimatePresence initial={false}>
            {textActive ? (
              <motion.div
                key="text"
                ref={textViewRef}
                {...fade}
                className="absolute inset-x-0 top-0"
              >
                <ActiveTextTypography />
              </motion.div>
            ) : (
              <motion.div
                key="stamp"
                ref={stampViewRef}
                {...fade}
                className="absolute inset-x-0 top-0 space-y-3"
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

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
