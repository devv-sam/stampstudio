import { useEffect } from "react";

import { useStampEditor } from "../../hooks/useStampEditor";
import { Type } from "lucide-react";

/** Bottom bar: text tool + placement hint — typography lives in the sidebar. */
export function TextFloatBar() {
  const {
    textPlacementActive,
    setTextPlacementActive,
    toggleTextPlacementActive,
  } = useStampEditor();

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
    <div className="pointer-events-auto absolute bottom-8 left-1/2 z-40 flex max-w-[min(96vw,calc(100%-2rem))] -translate-x-1/2 items-center gap-1 rounded-md border border-zinc-700/90 bg-zinc-900/95 ">
      {textPlacementActive ? (
        <>
          <p className="cursor-default truncate px-2 py-2 text-[11px] text-zinc-400">
            Click anywhere on the stamp to place text
          </p>
        </>
      ) : (
        <button
          type="button"
          onClick={() => toggleTextPlacementActive()}
          title="Add text — press T, then click the stamp"
          aria-pressed={textPlacementActive}
          className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-sm rounded-md font-bold transition-colors ${
            textPlacementActive
              ? "`#FF4B25` text-white"
              : "text-zinc-200 hover:bg-zinc-800 hover:text-white"
          }`}
        >
          <Type size={12} />
        </button>
      )}
    </div>
  );
}
