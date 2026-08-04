import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import type { Sheet, Stamp } from "../../vendor/stampstuff/index.js";
import { ColorPickerPortal } from "../UI/ColorPickerPortal";
import { PerforationSlider } from "../UI/PerforationSlider";
import { Toggle } from "../UI/Toggle";

/** Library defaults — mirrors Sheet's constructor + Sheet.stampDefaults. */
const SHEET_DEFAULTS = {
  background: "#0e0e0e",
  dragEnabled: true,
  idle: true,
  hover: true,
  rotationOnDrag: true,
} as const;

interface StickerStyle {
  borderWidth: number;
  borderColor: string;
  foilEnabled: boolean;
  foilIntensity: number;
  shadowStrength: number;
  scale: number;
  /** Radians — the panel shows degrees. */
  rotation: number;
}

const STICKER_DEFAULTS: StickerStyle = {
  borderWidth: 8,
  borderColor: "#ffffff",
  foilEnabled: false,
  foilIntensity: 0.6,
  shadowStrength: 0.35,
  scale: 1,
  rotation: 0,
};

const RAD_TO_DEG = 180 / Math.PI;

export type SettingsTab = "sheet" | "sticker";

/**
 * A Sheet and its Stamps are imperative WebGL objects: editing one means
 * writing to its live config in place, and the next frame picks the change up.
 * These writers sit at module scope so the mutation isn't happening on a
 * component prop — which the React Compiler flags, rightly, for regular data.
 */
function writeSheetConfig(sheet: Sheet, patch: Record<string, unknown>) {
  Object.assign(sheet.config, patch);
}

function writeSheetBackground(sheet: Sheet, hex: string) {
  sheet.applyBackground(hex);
  // The canvas clears to this colour, but the host element shows through for
  // the frame between a resize and the next draw — keep the two in step.
  sheet.container.style.background = hex;
}

/** Border/foil/shadow are shader uniforms, so they need a syncStyle() push. */
function writeStickerStyle(stamp: Stamp, patch: Partial<StickerStyle>) {
  Object.assign(stamp.config, patch);
  stamp.syncStyle();
}

/** Transforms are read fresh every frame — no sync call needed. */
function writeStickerTransform(
  stamp: Stamp,
  patch: { scale?: number; rotation?: number },
) {
  Object.assign(stamp.config, patch);
}

export function SheetSettingsPanel({
  sheet,
  selected,
  selectionKey,
  tab,
  onTabChange,
  onDeleteSelected,
}: {
  sheet: Sheet;
  selected: Stamp | null;
  /** Bumped on every selection change, to remount controls with fresh values. */
  selectionKey: number;
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  onDeleteSelected: () => void;
}) {
  return (
    <motion.div
      className="pointer-events-auto w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#121214]/95 shadow-2xl backdrop-blur-md"
      initial={{ opacity: 0, y: 22, scale: 0.965 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 14, scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 420,
        damping: 26,
        mass: 0.85,
        opacity: { duration: 0.16 },
      }}
    >
      <div className="space-y-4 px-5 py-4">
        <SegmentedTabs
          tab={tab}
          onTabChange={onTabChange}
          stickerEnabled={selected !== null}
        />

        {/* Keyed remount rather than AnimatePresence: the sticker pane holds a
            nested AnimatePresence (the foil slider), and a `mode="wait"` parent
            stalls waiting on that subtree — leaving the old pane on screen. The
            key gives the enter animation; the outgoing pane just goes. */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 460,
            damping: 32,
            mass: 0.6,
            opacity: { duration: 0.14 },
          }}
        >
          {tab === "sheet" || !selected ? (
            <SheetSettings sheet={sheet} />
          ) : (
            <StickerSettings
              key={selectionKey}
              selected={selected}
              onDeleteSelected={onDeleteSelected}
            />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Tabs ────────────────────────────────────────────────────────────────────

const TAB_SLIDE_MS = 250;
const TAB_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const TAB_PILL_ANIMATED_PROPS = "transform, width";

const TABS: readonly { id: SettingsTab; label: string }[] = [
  { id: "sheet", label: "Sheet" },
  { id: "sticker", label: "Sticker" },
];

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Sheet | Sticker. The Sticker half stays disabled until something on the
 * sheet is selected — double-clicking a sticker both selects it and lands here.
 *
 * The pill's transform + width are written inline from the active tab's
 * measured `offsetLeft`/`offsetWidth`, so the CSS transition tweens between the
 * previous and next positions. Re-snapped without animation on resize, so a
 * viewport change can't leave the pill desynced from its tab.
 */
function SegmentedTabs({
  tab,
  onTabChange,
  stickerEnabled,
}: {
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  stickerEnabled: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  /** First placement snaps; every move after that animates. */
  const placed = useRef(false);

  const activeIndex = tab === "sticker" && stickerEnabled ? 1 : 0;

  const moveTo = useCallback((index: number, animate: boolean) => {
    const el = tabRefs.current[index];
    const pill = pillRef.current;
    if (!el || !pill) return;
    const next = `translateX(${el.offsetLeft}px)`;
    const width = `${el.offsetWidth}px`;
    // Only transition-property is toggled — duration/easing stay put. Saving
    // and restoring the `transition` shorthand would wipe them, since it can't
    // round-trip the longhands React set via the style prop.
    if (animate && !prefersReducedMotion()) {
      pill.style.transitionProperty = TAB_PILL_ANIMATED_PROPS;
      pill.style.transform = next;
      pill.style.width = width;
      return;
    }
    pill.style.transitionProperty = "none";
    pill.style.transform = next;
    pill.style.width = width;
    void pill.offsetWidth; // flush, so re-arming the transition can't animate
    pill.style.transitionProperty = TAB_PILL_ANIMATED_PROPS;
  }, []);

  useLayoutEffect(() => {
    moveTo(activeIndex, placed.current);
    placed.current = true;
  }, [activeIndex, moveTo]);

  // Observe the bar itself rather than the window: the tabs are flex-1, so
  // their widths track the panel, which can change without a window resize.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => moveTo(activeIndex, false));
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeIndex, moveTo]);

  return (
    <div
      ref={listRef}
      className="relative flex gap-1 rounded-lg bg-zinc-900 p-1"
      role="tablist"
    >
      <span
        ref={pillRef}
        aria-hidden
        className="pointer-events-none absolute bottom-1 left-0 top-1 z-0 w-0 rounded-md bg-zinc-800"
        style={{
          transitionProperty: TAB_PILL_ANIMATED_PROPS,
          transitionDuration: `${TAB_SLIDE_MS}ms`,
          transitionTimingFunction: TAB_EASE,
          willChange: TAB_PILL_ANIMATED_PROPS,
        }}
      />
      {TABS.map(({ id, label }, i) => {
        const disabled = id === "sticker" && !stickerEnabled;
        const active = i === activeIndex;
        return (
          <button
            key={id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            title={
              disabled
                ? "Double-click a sticker on the sheet to style it"
                : undefined
            }
            onClick={() => onTabChange(id)}
            style={{
              transitionDuration: `${TAB_SLIDE_MS}ms`,
              transitionTimingFunction: TAB_EASE,
            }}
            className={`relative z-[1] flex-1 cursor-pointer rounded-md px-3 py-2 text-center text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25 disabled:cursor-not-allowed ${
              active
                ? "text-zinc-100"
                : disabled
                  ? "text-zinc-600"
                  : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Sheet-wide: background + the interaction switches. ───────────────────────

function SheetSettings({ sheet }: { sheet: Sheet }) {
  const [background, setBackground] = useState<string>(
    () => sheet.config.background ?? SHEET_DEFAULTS.background,
  );
  const [dragEnabled, setDragEnabled] = useState<boolean>(
    () => sheet.config.dragEnabled,
  );
  const [idle, setIdle] = useState<boolean>(() => sheet.config.idle);
  const [hover, setHover] = useState<boolean>(() => sheet.config.hover);
  const [rotationOnDrag, setRotationOnDrag] = useState<boolean>(
    () => sheet.config.rotationOnDrag,
  );

  const applyBackground = (hex: string) => {
    writeSheetBackground(sheet, hex);
    setBackground(hex);
  };

  const reset = () => {
    applyBackground(SHEET_DEFAULTS.background);
    writeSheetConfig(sheet, {
      dragEnabled: SHEET_DEFAULTS.dragEnabled,
      idle: SHEET_DEFAULTS.idle,
      hover: SHEET_DEFAULTS.hover,
      rotationOnDrag: SHEET_DEFAULTS.rotationOnDrag,
    });
    setDragEnabled(SHEET_DEFAULTS.dragEnabled);
    setIdle(SHEET_DEFAULTS.idle);
    setHover(SHEET_DEFAULTS.hover);
    setRotationOnDrag(SHEET_DEFAULTS.rotationOnDrag);
  };

  return (
    <div className="space-y-3">
      <SettingsGrid>
        <Column>
          <SettingRow label="Motion">
            <Toggle
              checked={idle}
              onChange={(v) => {
                writeSheetConfig(sheet, { idle: v });
                setIdle(v);
              }}
              aria-label="Idle motion"
            />
          </SettingRow>
          <SettingRow label="Hover lift">
            <Toggle
              checked={hover}
              onChange={(v) => {
                writeSheetConfig(sheet, { hover: v });
                setHover(v);
              }}
              aria-label="Hover lift"
            />
          </SettingRow>
        </Column>

        <Column>
          <SettingRow label="Background">
            <SwatchButton
              color={background}
              ariaLabel="Sheet background color"
              onPick={applyBackground}
            />
          </SettingRow>
          <SettingRow label="Draggable">
            <Toggle
              checked={dragEnabled}
              onChange={(v) => {
                writeSheetConfig(sheet, { dragEnabled: v });
                setDragEnabled(v);
              }}
              aria-label="Stickers draggable"
            />
          </SettingRow>
          <SettingRow label="Tilt on drag">
            <Toggle
              checked={rotationOnDrag}
              onChange={(v) => {
                writeSheetConfig(sheet, { rotationOnDrag: v });
                setRotationOnDrag(v);
              }}
              aria-label="Tilt on drag"
            />
          </SettingRow>
        </Column>
      </SettingsGrid>

      <SectionFooter>
        <TextButton onClick={reset}>Reset</TextButton>
      </SectionFooter>
    </div>
  );
}

// ── Per-sticker style + transform (only reachable with a selection). ─────────

function StickerSettings({
  selected,
  onDeleteSelected,
}: {
  selected: Stamp;
  onDeleteSelected: () => void;
}) {
  /** Read-only snapshot for the controls' start values. */
  const target: StickerStyle = selected.config;

  const [borderColor, setBorderColor] = useState<string>(
    () => target.borderColor,
  );
  const [foilEnabled, setFoilEnabled] = useState<boolean>(
    () => target.foilEnabled,
  );
  /** Bumped by Reset, to remount the (uncontrolled) sliders on new values. */
  const [revision, setRevision] = useState(0);

  const setStyle = (patch: Partial<StickerStyle>) =>
    writeStickerStyle(selected, patch);

  const reset = () => {
    setStyle({
      borderWidth: STICKER_DEFAULTS.borderWidth,
      borderColor: STICKER_DEFAULTS.borderColor,
      foilEnabled: STICKER_DEFAULTS.foilEnabled,
      foilIntensity: STICKER_DEFAULTS.foilIntensity,
      shadowStrength: STICKER_DEFAULTS.shadowStrength,
    });
    writeStickerTransform(selected, {
      scale: STICKER_DEFAULTS.scale,
      rotation: STICKER_DEFAULTS.rotation,
    });
    setBorderColor(STICKER_DEFAULTS.borderColor);
    setFoilEnabled(STICKER_DEFAULTS.foilEnabled);
    setRevision((r) => r + 1);
  };

  return (
    <div className="space-y-3">
      <SettingsGrid key={revision}>
        <Column>
          <PerforationSlider
            label="Border"
            defaultValue={target.borderWidth}
            minValue={0}
            maxValue={40}
            onInput={(v) => setStyle({ borderWidth: v })}
          />
          <SettingRow label="Border color">
            <SwatchButton
              color={borderColor}
              ariaLabel="Sticker border color"
              onPick={(hex) => {
                setStyle({ borderColor: hex });
                setBorderColor(hex);
              }}
            />
          </SettingRow>
          <PerforationSlider
            label="Shadow"
            defaultValue={Math.round(target.shadowStrength * 100)}
            minValue={0}
            maxValue={100}
            format={(v) => (v / 100).toFixed(2)}
            onInput={(v) => setStyle({ shadowStrength: v / 100 })}
          />
        </Column>

        <Column>
          <PerforationSlider
            label="Scale"
            defaultValue={Math.round(target.scale * 100)}
            minValue={20}
            maxValue={300}
            format={(v) => (v / 100).toFixed(2)}
            onInput={(v) => writeStickerTransform(selected, { scale: v / 100 })}
          />
          <PerforationSlider
            label="Rotation"
            defaultValue={Math.round(target.rotation * RAD_TO_DEG)}
            minValue={-45}
            maxValue={45}
            format={(v) => `${v}°`}
            onInput={(v) =>
              writeStickerTransform(selected, { rotation: v / RAD_TO_DEG })
            }
          />
          <SettingRow label="Holo foil">
            <Toggle
              checked={foilEnabled}
              onChange={(v) => {
                setStyle({ foilEnabled: v });
                setFoilEnabled(v);
              }}
              aria-label="Holo foil"
            />
          </SettingRow>
          <AnimatePresence initial={false}>
            {foilEnabled ? (
              <motion.div
                key="foil-intensity"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{
                  height: {
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                    mass: 0.7,
                  },
                  opacity: { duration: 0.16 },
                }}
                style={{ overflow: "hidden" }}
              >
                <PerforationSlider
                  label="Foil intensity"
                  defaultValue={Math.round(target.foilIntensity * 100)}
                  minValue={0}
                  maxValue={100}
                  format={(v) => (v / 100).toFixed(2)}
                  onInput={(v) => setStyle({ foilIntensity: v / 100 })}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Column>
      </SettingsGrid>

      <SectionFooter>
        <TextButton onClick={onDeleteSelected} danger>
          Delete sticker
        </TextButton>
        <TextButton onClick={reset}>Reset</TextButton>
      </SectionFooter>
    </div>
  );
}

// ── Shared chrome ───────────────────────────────────────────────────────────

function SettingsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-x-4 gap-y-2.5 sm:grid-cols-2">
      {children}
    </div>
  );
}

function Column({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2.5">{children}</div>;
}

/**
 * The pill a non-slider control sits in — same shell as PerforationSlider, so
 * a toggle row and a slider row line up in the same column.
 */
function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-10 w-full items-center justify-between gap-3 rounded-lg bg-zinc-900 px-3">
      <span className="select-none text-sm text-zinc-300">{label}</span>
      {children}
    </div>
  );
}

function SwatchButton({
  color,
  ariaLabel,
  onPick,
}: {
  color: string;
  ariaLabel: string;
  onPick: (hex: string) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <button
        type="button"
        title={color}
        aria-label={ariaLabel}
        aria-expanded={anchor !== null}
        onClick={(e) =>
          setAnchor((a) => (a ? null : (e.currentTarget as HTMLElement)))
        }
        className="h-5 w-5 shrink-0 cursor-pointer rounded ring-1 ring-inset ring-white/15 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        style={{ background: color }}
      />
      {anchor ? (
        <ColorPickerPortal
          anchorEl={anchor}
          colorHex={color}
          onPick={onPick}
          onClose={() => setAnchor(null)}
        />
      ) : null}
    </>
  );
}

function SectionFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-0.5">{children}</div>
  );
}

function TextButton({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer text-[10px] underline-offset-2 transition-colors hover:underline ${
        danger
          ? "text-red-400/80 hover:text-red-300"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}
