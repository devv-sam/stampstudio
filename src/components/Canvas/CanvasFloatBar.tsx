import { useEffect } from "react";

import { Image as ImageIcon, Type } from "lucide-react";

import { useImageUploadFlow } from "../../hooks/useImageUploadFlow";
import { useStampEditor } from "../../hooks/useStampEditor";

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
  } = useStampEditor();

  const frameUpload = useImageUploadFlow({ defaultRole: "frame" });

  /** T toggles placement; Escape cancels placement. */
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
  }, [textPlacementActive, setTextPlacementActive, toggleTextPlacementActive]);

  return (
    <>
      <div className="pointer-events-auto absolute bottom-8 left-1/2 z-40 flex max-w-[min(96vw,calc(100%-2rem))] -translate-x-1/2 items-center gap-1 rounded-md border border-zinc-700/90 bg-zinc-900/95 ">
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
              title="Upload an interactive element you can move, scale, and rotate"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-sm rounded-md font-bold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <ImageIcon size={12} />
            </button>
          </>
        )}
      </div>

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
