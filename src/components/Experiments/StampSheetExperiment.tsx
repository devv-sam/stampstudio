import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Download, Plus, SlidersHorizontal, X } from "lucide-react";

import { Sheet, type Stamp } from "../../vendor/stampstuff/index.js";
import { exportSheet } from "../../vendor/stampstuff/export.js";
import embedTemplate from "../../vendor/stampstuff/embed-template.html?raw";
import { useExperiments } from "../../hooks/useExperiments";
import {
  SheetSettingsPanel,
  type SettingsTab,
} from "./SheetSettingsPanel";
import {
  getStampLibrary,
  type StampLibraryEntry,
} from "../../utils/stampLibraryStorage";
import { buildPerforationClipPathD } from "../../utils/stampPerforationLayout";

const SHEET_BACKGROUND = "#0e0e0e";
const DRAG_MIME = "application/x-stampsheet-src";
const DRAG_DIMS_MIME = "application/x-stampsheet-dims";

// The "+" tile matches the real stamps' die-cut edge: same perforation path
// builder used on the studio canvas, applied here as a CSS clip-path.
const PLUS_SIZE = 90;
const PLUS_CLIP = `path(evenodd, "${buildPerforationClipPathD(
  PLUS_SIZE,
  PLUS_SIZE,
  20,
)}")`;

// Drawer thumbnails render at the stamp's *true* size — what you'll see when
// you drop it on the sheet — so the drawer is an honest preview. A hard cap on
// both dimensions keeps odd aspect ratios from stretching the row; only stamps
// bigger than the cap are scaled down (never up).
const TRAY_MAX_WIDTH = 180;
const TRAY_MAX_HEIGHT = 90;

function trayScale(width: number, height: number): number {
  return Math.min(
    1,
    TRAY_MAX_WIDTH / Math.max(1, width),
    TRAY_MAX_HEIGHT / Math.max(1, height),
  );
}

export function StampSheetExperiment() {
  const { exit } = useExperiments();

  const hostRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<Sheet | null>(null);
  const hudRef = useRef<HTMLDivElement | null>(null);

  // Library stamps + anything the user uploads this session, all draggable.
  const [library] = useState<StampLibraryEntry[]>(() => getStampLibrary());
  const [uploaded, setUploaded] = useState<StampLibraryEntry[]>([]);
  const trayStamps = useMemo(
    () => [...uploaded, ...library],
    [uploaded, library],
  );

  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // Settings drawer + the sticker it's editing. `selectionKey` bumps on every
  // selection change so the sticker controls remount with the new values (the
  // sliders are uncontrolled — they read their start value once, on mount).
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("sheet");
  const [selected, setSelected] = useState<Stamp | null>(null);
  const [selectionKey, setSelectionKey] = useState(0);
  // The live Sheet, mirrored into state so the settings panel can render with
  // it (sheetRef stays for the imperative handlers, which run after render).
  const [sheet, setSheet] = useState<Sheet | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // A new upload lands at the front (left) — snap the drawer back so it shows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [uploaded.length]);

  // ── Drag-to-slide the strip. A horizontal drag pans the drawer; an upward
  //    drag on a stamp is left to the native drag so it can drop on the sheet.
  const pan = useRef({ down: false, startX: 0, startY: 0, startScroll: 0, horizontal: false });

  const onStripPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    pan.current = {
      down: true,
      startX: e.clientX,
      startY: e.clientY,
      startScroll: el.scrollLeft,
      horizontal: false,
    };
  }, []);

  const onStripPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const st = pan.current;
    const el = scrollRef.current;
    if (!st.down || !el) return;
    if (e.buttons === 0) {
      st.down = false; // button was released off-strip (e.g. after a drag)
      return;
    }
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!st.horizontal && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
      st.horizontal = true;
      el.setPointerCapture?.(e.pointerId);
    }
    if (st.horizontal) el.scrollLeft = st.startScroll - dx;
  }, []);

  const endStripPan = useCallback(() => {
    pan.current.down = false;
    // Clear the flag next frame so an in-flight dragstart still reads it.
    requestAnimationFrame(() => (pan.current.horizontal = false));
  }, []);

  // ── Wheel-to-scroll. Mouse wheels only report deltaY, so a plain scroll
  //    gesture would do nothing on a horizontal strip — remap it to scrollLeft.
  //    Trackpads that already send deltaX (shift-scroll or a horizontal swipe)
  //    are passed through as-is. Attached natively so preventDefault works;
  //    React's onWheel is passive and can't stop the page from also scrolling.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent) => {
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      el.scrollLeft += delta;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [trayStamps.length]);

  // ── Mount the WebGL sheet once, into the host div. ────────────────────────
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const sheet = new Sheet(host, {
      background: SHEET_BACKGROUND,
      dragEnabled: true,
    });
    sheetRef.current = sheet;
    setSheet(sheet);

    // Selection drives which sticker the settings drawer edits.
    sheet.onSelect = (stamp: Stamp | null) => {
      setSelected(stamp);
      setSelectionKey((k) => k + 1);
    };

    // Double-clicking a sticker is the way into its settings: the preceding
    // pointerdown already selected it, so this just opens the drawer on the
    // Sticker tab. Double-clicking bare sheet is ignored.
    const onDoubleClick = (e: MouseEvent) => {
      const { x, y } = sheet.toWorld(e.clientX, e.clientY);
      if (!sheet.pick(x, y)) return;
      setSettingsOpen(true);
      setSettingsTab("sticker");
    };
    sheet.canvas.addEventListener("dblclick", onDoubleClick);

    // Keep the dimension HUD glued above the selected stamp, updated per frame
    // (imperative — no React re-render on every animation tick).
    sheet.onFrame = () => {
      const hud = hudRef.current;
      const s = sheet.selected;
      if (!hud) return;
      if (!s) {
        hud.style.opacity = "0";
        return;
      }
      const rect = sheet.canvas.getBoundingClientRect();
      const nx = s._ax / sheet.width + 0.5;
      const ny = 0.5 - s._ay / sheet.height;
      const halfH = (s.baseHeight * s._as) / 2;
      const w = Math.round(s.baseWidth * s.config.scale * s.config.baseScale);
      const h = Math.round(s.baseHeight * s.config.scale * s.config.baseScale);
      hud.textContent = `${w} × ${h}`;
      hud.style.left = `${nx * rect.width}px`;
      hud.style.top = `${ny * rect.height - halfH - 10}px`;
      hud.style.opacity = "1";
    };

    return () => {
      sheet.canvas.removeEventListener("dblclick", onDoubleClick);
      sheet.destroy();
      sheetRef.current = null;
      setSheet(null);
    };
  }, []);

  // Deselecting (or deleting) while on the Sticker tab drops back to Sheet —
  // that tab has nothing to edit without a selection. Derived rather than
  // stored, so losing the selection can't leave a stale tab behind.
  const activeTab: SettingsTab = selected ? settingsTab : "sheet";

  // ── Drag a tray stamp onto the sheet → add it where it was dropped. ────────
  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const src = e.dataTransfer.getData(DRAG_MIME);
    const sheet = sheetRef.current;
    if (!src || !sheet) return;
    // Render on the sheet at the same size shown in the drawer: fold the
    // drawer's cap-scale into baseScale so a dropped stamp matches its preview.
    const dims = /^(\d+)x(\d+)$/.exec(e.dataTransfer.getData(DRAG_DIMS_MIME));
    const baseScale = dims ? trayScale(Number(dims[1]), Number(dims[2])) : 1;
    const { x, y } = sheet.toWorld(e.clientX, e.clientY);
    void sheet.addStamp({ src, x, y, baseScale });
  }, []);

  // ── "+" upload: read an external PNG/JPG into the tray. It stays in the
  //    drawer until the user drags it onto the sheet — no auto-placement. ─────
  const onUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        setUploaded((prev) => [
          {
            id: `upload-${Date.now()}`,
            src,
            width: img.naturalWidth,
            height: img.naturalHeight,
            createdAt: Date.now(),
          },
          ...prev,
        ]);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  // removeStamp clears sheet.selected but doesn't fire onSelect — do it here.
  const onDeleteSelected = useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet || !sheet.selected) return;
    sheet.removeStamp(sheet.selected);
    setSelected(null);
    setSelectionKey((k) => k + 1);
  }, []);

  const onDownload = useCallback(async () => {
    const sheet = sheetRef.current;
    if (!sheet || busy) return;
    setBusy(true);
    setBanner(null);
    try {
      await exportSheet(sheet, {
        template: embedTemplate,
        runtimeUrl: "/stampstuff/stampsheet.js",
        title: "stampsheet",
        filename: "stampsheet.html",
      });
    } catch (err) {
      setBanner(
        err instanceof Error ? err.message : "Export failed — try again",
      );
    } finally {
      setBusy(false);
    }
  }, [busy]);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 4200);
    return () => window.clearTimeout(t);
  }, [banner]);

  // The upload tile — centered when the drawer is empty, pinned left otherwise.
  const plusTile = (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      title="Upload an image"
      style={{
        width: PLUS_SIZE,
        height: PLUS_SIZE,
        clipPath: PLUS_CLIP,
        WebkitClipPath: PLUS_CLIP,
      }}
      className="flex shrink-0 cursor-pointer items-center justify-center bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
    >
      <Plus size={30} strokeWidth={2.5} aria-hidden />
      <span className="sr-only">Upload an image</span>
    </button>
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-[#0b0b0c]"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Sheet canvas region */}
      <div className="relative flex min-h-0 flex-1 items-stretch justify-center p-6 sm:p-10">
        <div
          ref={hostRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="relative h-full w-full max-w-5xl overflow-hidden rounded-sm border border-zinc-800/70"
          style={{ background: SHEET_BACKGROUND }}
        >
          {/* Selected-stamp dimension read-out, tracks the stamp each frame. */}
          <div
            ref={hudRef}
            aria-hidden
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full font-mono text-[10px] tracking-wide text-zinc-400 opacity-0"
            style={{ left: 0, top: 0 }}
          />
        </div>
      </div>

      {/* Stamp drawer — framed by two rules capped to the same max-w-5xl as
          the canvas above and centered to match its edges. Empty: the "+"
          sits centered. With stamps: the "+" is pinned on the left and never
          moves; the strip of stamps slides (drag or scroll) so earlier
          uploads can be reached. Newest sit nearest the "+". */}
      <div className="shrink-0 px-6 sm:px-10">
        <div className="mx-auto w-full max-w-5xl border-y border-zinc-800/70 px-6 py-9">
          {trayStamps.length === 0 ? (
            <div className="flex justify-center">{plusTile}</div>
          ) : (
            <div className="flex items-center gap-7">
              {plusTile}
              <div
                ref={scrollRef}
                onPointerDown={onStripPointerDown}
                onPointerMove={onStripPointerMove}
                onPointerUp={endStripPan}
                onPointerLeave={endStripPan}
                onPointerCancel={endStripPan}
                className="flex min-w-0 flex-1 cursor-grab select-none items-center gap-7 overflow-x-auto [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
              >
                {trayStamps.map((stamp) => {
                  const scale = trayScale(stamp.width, stamp.height);
                  return (
                    <img
                      key={stamp.id}
                      src={stamp.src}
                      alt=""
                      draggable
                      onDragStart={(e) => {
                        // Horizontal gesture = panning the strip, not placing.
                        if (
                          pan.current.horizontal ||
                          Math.abs(e.clientX - pan.current.startX) >
                            Math.abs(e.clientY - pan.current.startY)
                        ) {
                          e.preventDefault();
                          return;
                        }
                        e.dataTransfer.setData(DRAG_MIME, stamp.src);
                        e.dataTransfer.setData(
                          DRAG_DIMS_MIME,
                          `${stamp.width}x${stamp.height}`,
                        );
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onDragEnd={endStripPan}
                      title="Drag onto the sheet"
                      style={{
                        width: stamp.width * scale,
                        height: stamp.height * scale,
                      }}
                      className="shrink-0 object-contain"
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={onUpload}
          className="hidden"
        />
      </div>

      {banner ? (
        <div
          role="status"
          className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300"
        >
          {banner}
        </div>
      ) : null}

      {/* Bottom action bar (reuses the studio's floating-pill look). While the
          settings drawer is open the pill collapses to a single close button,
          and the drawer floats directly above it, over the stamp drawer. */}
      <div className="relative flex shrink-0 items-center justify-center pb-8 pt-2">
        {/* Positioning shell stays mounted so the panel itself can be the
            direct AnimatePresence child (it owns the enter/exit spring). */}
        <div className="pointer-events-none absolute inset-x-0 bottom-full z-30 mb-3 flex justify-center px-6 sm:px-10">
          <div className="w-full max-w-3xl">
            <AnimatePresence>
              {settingsOpen && sheet ? (
                <SheetSettingsPanel
                  key="panel"
                  sheet={sheet}
                  selected={selected}
                  selectionKey={selectionKey}
                  tab={activeTab}
                  onTabChange={setSettingsTab}
                  onDeleteSelected={onDeleteSelected}
                />
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {settingsOpen ? (
            <motion.div
              key="close"
              className="flex items-center rounded-md border border-zinc-700/90 bg-zinc-900/95 px-2 py-1.5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 28,
                mass: 0.6,
              }}
            >
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                title="Close settings"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                <X size={14} aria-hidden />
                <span className="sr-only">Close settings</span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="actions"
              className="flex items-center gap-1 rounded-md border border-zinc-700/90 bg-zinc-900/95 px-2 py-1.5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 28,
                mass: 0.6,
              }}
            >
              <button
                type="button"
                onClick={exit}
                title="Back to studio"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                <ArrowLeft size={14} aria-hidden />
                <span className="sr-only">Back to studio</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                title="Sheet settings"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                <SlidersHorizontal size={14} aria-hidden />
                <span className="sr-only">Sheet settings</span>
              </button>
              <button
                type="button"
                onClick={onDownload}
                disabled={busy}
                title="Export sheet as HTML"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={14} aria-hidden />
                <span className="sr-only">Export sheet as HTML</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
