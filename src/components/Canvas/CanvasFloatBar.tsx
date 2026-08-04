import { useCallback, useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { Download, FlaskConical, Image as ImageIcon, Type } from "lucide-react";

import { useImageUploadFlow } from "../../hooks/useImageUploadFlow";
import { useStampEditor } from "../../hooks/useStampEditor";
import { useExperiments } from "../../hooks/useExperiments";

type ExportFormatChip = "png" | "svg";
type ResolutionChip = "1080p" | "4k" | "6k";

function resolutionToMultiplier(
  preset: ResolutionChip,
  stampW: number,
  stampH: number,
): number {
  const longEdge = Math.max(1, stampW, stampH);
  const target = preset === "1080p" ? 1080 : preset === "4k" ? 3840 : 6144;
  const m = target / longEdge;
  return Math.min(32, Math.max(1, Math.round(m * 1000) / 1000));
}

const chipBase =
  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-[color,background-color] duration-200 ease-out";
const chipInactive = "cursor-pointer text-zinc-500 hover:text-zinc-300";
const chipActive = "cursor-default bg-zinc-800 text-zinc-100";

/**
 * Bottom canvas-side bar with the in-canvas tools:
 *   • Text — click then place on the stamp (T toggles placement, Esc cancels)
 *   • Frames — upload an interactive image element (movable, scalable,
 *     rotatable, recroppable). Frames live alongside backgrounds in the
 *     library and can be promoted to background — and vice versa — via
 *     the asset menu.
 *
 * Background uploads stay in the sidebar's Fill section so the two flows
 * read clearly: "fill the stamp" vs "drop something on the stamp".
 */
export function CanvasFloatBar() {
  const {
    textPlacementActive,
    setTextPlacementActive,
    toggleTextPlacementActive,
    stampDimensions,
    exportPng,
    exportSvg,
    copyPng,
    copySvg,
  } = useStampEditor();

  const frameUpload = useImageUploadFlow({ defaultRole: "frame" });
  const { launch: launchExperiment } = useExperiments();

  const [exportPopoverOpen, setExportPopoverOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormatChip>("png");
  const [resolution, setResolution] = useState<ResolutionChip>("4k");
  const [exportBusy, setExportBusy] = useState(false);
  const [exportBanner, setExportBanner] = useState<string | null>(null);

  const floatRootRef = useRef<HTMLDivElement | null>(null);

  const showBanner = useCallback((message: string | null) => {
    setExportBanner(message);
    if (message) {
      window.setTimeout(() => setExportBanner(null), 4200);
    }
  }, []);

  const multiplier =
    exportFormat === "png"
      ? resolutionToMultiplier(
          resolution,
          stampDimensions.width,
          stampDimensions.height,
        )
      : 2;

  const runExportAction = async (mode: "download" | "copy") => {
    setExportBusy(true);
    showBanner(null);
    try {
      if (exportFormat === "png") {
        if (mode === "download") await exportPng(multiplier);
        else await copyPng(multiplier);
      } else {
        if (mode === "download") await exportSvg();
        else await copySvg();
      }
      if (mode === "copy") showBanner("Copied to clipboard");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Export failed — try again";
      showBanner(msg);
    } finally {
      setExportBusy(false);
    }
  };

  /** T toggles placement; Escape cancels placement or closes export popover. */
  useEffect(() => {
    function onDocKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const tag = el.tagName?.toLowerCase();
      const formField =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el.isContentEditable;
      const fabricTyping =
        el.closest?.('[data-fabric="textarea-wrapper"]') != null ||
        el.classList?.contains?.("fabric-hide-text-area") ||
        !!el.closest?.(".textarea-container");
      if (formField || fabricTyping) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Escape") {
        if (exportPopoverOpen) {
          e.preventDefault();
          setExportPopoverOpen(false);
          return;
        }
        if (textPlacementActive) setTextPlacementActive(false);
        return;
      }

      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        toggleTextPlacementActive();
      }
    }

    document.addEventListener("keydown", onDocKeyDown, true);
    return () => document.removeEventListener("keydown", onDocKeyDown, true);
  }, [
    textPlacementActive,
    setTextPlacementActive,
    toggleTextPlacementActive,
    exportPopoverOpen,
  ]);

  useEffect(() => {
    if (!exportPopoverOpen) return;

    function onPointerDown(ev: MouseEvent | PointerEvent) {
      const root = floatRootRef.current;
      const t = ev.target as Node | null;
      if (!root || !t || root.contains(t)) return;
      setExportPopoverOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [exportPopoverOpen]);

  const formatOptions: { id: ExportFormatChip; label: string }[] = [
    { id: "png", label: "PNG" },
    { id: "svg", label: "SVG" },
  ];

  const resolutionOptions: { id: ResolutionChip; label: string }[] = [
    { id: "1080p", label: "1080p" },
    { id: "4k", label: "4K" },
    { id: "6k", label: "6K" },
  ];

  const toolsRow = (
    <>
      {textPlacementActive ? (
        <p className="cursor-default truncate px-2 py-2 text-[11px] text-zinc-400">
          Click anywhere on the stamp to place text
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => toggleTextPlacementActive()}
            title="Add text"
            aria-pressed={textPlacementActive}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-sm rounded-md font-bold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <Type size={12} />
          </button>
          <button
            type="button"
            onClick={() => frameUpload.open()}
            title="Upload frame"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-sm rounded-md font-bold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <ImageIcon size={12} />
          </button>
          <button
            type="button"
            onClick={() => launchExperiment("stampsheet")}
            title="Experiments"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-sm rounded-md font-bold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <FlaskConical size={12} />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => setExportPopoverOpen((o) => !o)}
        title="Export stamp"
        aria-expanded={exportPopoverOpen}
        aria-haspopup="dialog"
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-sm font-bold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <Download size={12} aria-hidden />
        <span className="sr-only">Open export options</span>
      </button>
    </>
  );

  return (
    <>
      <div
        ref={floatRootRef}
        className="pointer-events-auto absolute bottom-8 left-1/2 z-40 flex max-w-[min(96vw,calc(100%-2rem))] -translate-x-1/2 flex-col items-center gap-2"
      >
        <AnimatePresence initial={false}>
          {exportPopoverOpen ? (
            <motion.div
              role="dialog"
              aria-label="Export stamp"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 520, damping: 34 }}
              className="w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-zinc-700/90 bg-black shadow-2xl"
            >
              <div className="flex gap-6 px-4 pb-4 pt-3.5">
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                    Format
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {formatOptions.map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        disabled={exportBusy}
                        aria-pressed={exportFormat === id}
                        onClick={() => setExportFormat(id)}
                        className={`${chipBase} ${
                          exportFormat === id ? chipActive : chipInactive
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className={`flex min-w-0 flex-col gap-2 ${
                    exportFormat === "svg" ? "opacity-40" : ""
                  }`}
                  aria-hidden={exportFormat === "svg"}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                    Resolution
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {resolutionOptions.map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        disabled={exportBusy || exportFormat === "svg"}
                        aria-pressed={resolution === id}
                        onClick={() => setResolution(id)}
                        className={`${chipBase} ${
                          resolution === id && exportFormat === "png"
                            ? chipActive
                            : chipInactive
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-zinc-800/90" />

              <div className="flex gap-2 p-3">
                <button
                  type="button"
                  disabled={exportBusy}
                  onClick={() => runExportAction("download")}
                  className="min-h-10 flex-1 cursor-pointer rounded-md bg-white px-3 text-[13px] font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export
                </button>
                <button
                  type="button"
                  disabled={exportBusy}
                  onClick={() => runExportAction("copy")}
                  className="min-h-10 flex-1 cursor-pointer rounded-md bg-zinc-800 px-3 text-[13px] font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Copy
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div
          layout
          transition={{ type: "spring", stiffness: 460, damping: 32 }}
          className="flex items-center gap-1 rounded-md border border-zinc-700/90 bg-zinc-900/95 px-2 py-1.5"
        >
          {toolsRow}
        </motion.div>
      </div>

      {exportBanner ? (
        <div
          className={`pointer-events-none absolute bottom-36 left-1/2 z-40 max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border px-3 py-1.5 text-xs ${
            exportBanner === "Copied to clipboard"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
          role="status"
        >
          {exportBanner}
        </div>
      ) : null}

      {frameUpload.error ? (
        <div className="pointer-events-none absolute bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
          {frameUpload.error}
        </div>
      ) : null}

      {frameUpload.fileInputElement}
      {frameUpload.overlayElement}
    </>
  );
}
