import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChromePicker } from "react-color";

/**
 * A ChromePicker floated next to an anchor element, in a body portal so it
 * escapes any `overflow: hidden` ancestor. Flips above the anchor when there
 * isn't room below, and closes on outside-click or Escape.
 */
export function ColorPickerPortal({
  anchorEl,
  colorHex,
  onPick,
  onClose,
}: {
  anchorEl: HTMLElement;
  colorHex: string;
  onPick: (hex: string) => void;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  useLayoutEffect(() => {
    const reposition = () => {
      const popover = popoverRef.current;
      const a = anchorEl.getBoundingClientRect();
      if (!popover) {
        /** Placeholder before first paint — assume picker footprint */
        const guessW = 276;
        const guessH = 340;
        const margin = 8;
        const left = Math.min(
          innerWidth - margin - guessW,
          Math.max(margin, a.right - guessW),
        );
        let top = a.bottom + 6;
        if (top + guessH > innerHeight - margin) {
          top = Math.max(margin, a.top - guessH - 6);
        }
        setPosition({ left, top });
        return;
      }
      const pw = popover.offsetWidth;
      const ph = popover.offsetHeight;
      const margin = 8;

      let left = a.right - pw;
      if (left < margin) left = Math.max(margin, a.left - (pw - a.width));
      if (left + pw > innerWidth - margin) {
        left = Math.max(margin, innerWidth - pw - margin);
      }

      let top = a.bottom + 6;
      if (top + ph > innerHeight - margin) {
        top = Math.max(margin, a.top - ph - 6);
      }

      setPosition({ left, top });
    };

    reposition();
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(reposition);
    });
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [anchorEl]);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      const popover = popoverRef.current;
      if (!popover) return;
      const t = e.target as Node | null;
      if (!t) return;
      if (popover.contains(t) || anchorEl.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [anchorEl, onClose]);

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[100]"
      style={{
        left: position?.left ?? -9999,
        top: position?.top ?? -9999,
        visibility: position ? "visible" : "hidden",
      }}
      onMouseDown={(e) => {
        /** Keep focus in picker; sidebar doesn't steal clicks */
        e.stopPropagation();
      }}
    >
      <div className="rounded-xl border border-zinc-700 bg-[#141416] shadow-2xl">
        <ChromePicker
          color={colorHex}
          onChange={(c) => onPick(c.hex)}
          disableAlpha
        />
      </div>
    </div>,
    document.body,
  );
}
