import {
  CheckIcon,
  ChevronDownIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useStampEditor } from "../../hooks/useStampEditor";
import { STAMP_FONTS, STAMP_FONT_SIZES } from "../../types/text";

let fontsWarmed = false;

export function useDismissOnOutside<E extends HTMLElement>(
  open: boolean,
  onDismiss: () => void,
) {
  const containerRef = useRef<E | null>(null);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = containerRef.current;
      if (el && !el.contains(e.target as Node)) onDismiss();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onDismiss]);

  return containerRef;
}

function formatFontQueryTrim(s: string) {
  return s.trim().toLowerCase();
}

function weightLabel(weight: number): string {
  const map: Record<number, string> = {
    100: "Thin",
    200: "Extra light",
    300: "Light",
    400: "Regular",
    500: "Medium",
    600: "Semi bold",
    700: "Bold",
    800: "Extra bold",
    900: "Black",
  };
  return map[weight] ?? `${weight}`;
}

const FONT_SIZE_MIN = 6;
const FONT_SIZE_MAX = 200;

function clampFontSizePx(n: number): number {
  if (Number.isNaN(n)) return FONT_SIZE_MIN;
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(n)));
}

function parseSizeInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return null;
  return clampFontSizePx(parseInt(digits, 10));
}

/** CSS `font-family` value — multi-word names must be quoted or the browser treats them as separate families (falls back to Times). */
function quotedFontFamily(name: string): string {
  const escaped = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `'${escaped}'`;
}

/** Sidebar typography controls — only mounts when text is selected (caller may skip during placement mode). */
export function ActiveTextTypography({
  renderColor,
}: {
  renderColor: (color: string, setColor: (color: string) => void) => ReactNode;
}) {
  const {
    textLayers,
    selectedTextId,
    updateTextLayer,
    removeTextLayer,
  } = useStampEditor();

  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const [weightDropdownOpen, setWeightDropdownOpen] = useState(false);
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [fontSearch, setFontSearch] = useState("");
  const [sizeDraft, setSizeDraft] = useState("");

  const closeFontDropdown = useCallback(() => {
    setFontDropdownOpen(false);
    setFontSearch("");
  }, []);

  const closeWeightDropdown = useCallback(
    () => setWeightDropdownOpen(false),
    [],
  );

  const closeSizeDropdown = useCallback(() => setSizeDropdownOpen(false), []);

  const fontTrayRef = useDismissOnOutside<HTMLDivElement>(
    fontDropdownOpen,
    closeFontDropdown,
  );
  const weightTrayRef = useDismissOnOutside<HTMLDivElement>(
    weightDropdownOpen,
    closeWeightDropdown,
  );
  const sizeTrayRef = useDismissOnOutside<HTMLDivElement>(
    sizeDropdownOpen,
    closeSizeDropdown,
  );

  const current = useMemo(
    () => textLayers.find((t) => t.id === selectedTextId) ?? null,
    [textLayers, selectedTextId],
  );

  // keeps showing the last layer while the sidebar crossfades away after a deselect
  const [lastLayer, setLastLayer] = useState(current);
  if (current && current !== lastLayer) setLastLayer(current);
  const selected = current ?? lastLayer;

  const fontDef = useMemo(
    () => STAMP_FONTS.find((f) => f.family === selected?.fontFamily),
    [selected?.fontFamily],
  );

  const weights = fontDef?.weights ?? [400];

  const filteredFonts = useMemo(() => {
    const q = formatFontQueryTrim(fontSearch);
    if (!q) return STAMP_FONTS;
    return STAMP_FONTS.filter(
      (f) =>
        f.label.toLowerCase().includes(q) || f.family.toLowerCase().includes(q),
    );
  }, [fontSearch]);

  const canonLayerId = selected?.id;
  const canonFontSize = selected?.fontSize;

  useEffect(() => {
    if (canonLayerId === undefined || canonFontSize === undefined) return;
    queueMicrotask(() => setSizeDraft(String(canonFontSize)));
  }, [canonLayerId, canonFontSize]);

  // Warm up the browser's FontFaceSet for every stamp font so dropdown
  // previews render in the correct typeface instead of falling back to serif.
  useEffect(() => {
    if (fontsWarmed || typeof document === "undefined" || !document.fonts) return;
    fontsWarmed = true;
    for (const f of STAMP_FONTS) {
      for (const w of f.weights) {
        document.fonts.load(`${w} 16px "${f.family}"`).catch(() => {});
      }
    }
  }, []);

  const commitSizeDraft = useCallback(() => {
    if (!selected) return;
    const parsed = parseSizeInput(sizeDraft);
    if (parsed === null) {
      setSizeDraft(String(selected.fontSize));
      return;
    }
    updateTextLayer(selected.id, { fontSize: parsed });
    setSizeDraft(String(parsed));
  }, [selected, sizeDraft, updateTextLayer]);

  const toggleFontDropdown = () => {
    setSizeDropdownOpen(false);
    setWeightDropdownOpen(false);
    setFontDropdownOpen((o) => !o);
    if (fontDropdownOpen) setFontSearch("");
  };

  const toggleWeightDropdown = () => {
    setFontDropdownOpen(false);
    setSizeDropdownOpen(false);
    setFontSearch("");
    setWeightDropdownOpen((o) => !o);
  };

  const toggleSizeDropdown = () => {
    setFontDropdownOpen(false);
    setWeightDropdownOpen(false);
    setFontSearch("");
    setSizeDropdownOpen((o) => !o);
  };

  const dropdownBelow =
    "absolute top-full left-0 right-0 z-50 mt-1 max-md:top-auto max-md:bottom-full max-md:mt-0 max-md:mb-1 max-h-52 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-xl border border-zinc-700 bg-zinc-950 py-1 shadow-chunky";

  if (!selected) return null;

  return (
    <div className="space-y-3">
      <section className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="px-1 pt-1 text-sm text-ink-soft">Typography</h2>
        <button
          type="button"
          onClick={() => removeTextLayer(selected.id)}
          className="flex h-7 w-7 shrink-0 items-center cursor-pointer justify-center rounded-xl text-ink-soft transition-colors hover:bg-red-950/45 hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          title="Remove text layer"
          aria-label="Remove text layer"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        <div ref={fontTrayRef} className="relative">
          {/*
           * Native <button> gets Tailwind preflight `font` shorthand — use div+role instead
           * so each preview `font-family` applies reliably.
           */}
          <div
            role="button"
            tabIndex={0}
            onClick={toggleFontDropdown}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleFontDropdown();
              }
            }}
            aria-expanded={fontDropdownOpen}
            aria-haspopup="listbox"
            className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl bg-zinc-900 px-3 text-left font-normal transition-colors hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            style={{ fontFamily: quotedFontFamily(selected.fontFamily) }}
          >
            <span className="min-w-0 flex-1 truncate text-sm text-zinc-100">
              {fontDef?.label ?? selected.fontFamily}
            </span>
            <span className="font-preview-ui inline-flex shrink-0">
              <ChevronDownIcon
                className={`h-4 w-4 text-zinc-500 transition-transform ${fontDropdownOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </span>
          </div>

          {fontDropdownOpen ? (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-chunky">
              <label className="sr-only">Filter fonts</label>
              <input
                type="search"
                autoFocus
                value={fontSearch}
                placeholder="Search fonts…"
                onChange={(e) => setFontSearch(e.target.value)}
                className="w-full cursor-text border-b border-zinc-800 bg-zinc-900/70 px-2 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/15"
              />
              <ul role="listbox" className="max-h-48 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1">
                {filteredFonts.map((f) => {
                  const isActive = selected.fontFamily === f.family;
                  return (
                    <li key={f.family} role="none">
                      <div
                        role="option"
                        aria-selected={isActive}
                        tabIndex={-1}
                        onClick={() => {
                          updateTextLayer(selected.id, {
                            fontFamily: f.family,
                            fontWeight: f.weights.includes(selected.fontWeight)
                              ? selected.fontWeight
                              : (f.weights[0] ?? 400),
                          });
                          closeFontDropdown();
                        }}
                        className={`flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left font-normal transition-colors select-none ${
                          isActive
                            ? "bg-zinc-800/95 text-zinc-100"
                            : "text-zinc-200 hover:bg-zinc-800/60"
                        }`}
                        style={{ fontFamily: quotedFontFamily(f.family) }}
                      >
                        <span className="font-preview-ui flex w-5 shrink-0 justify-center text-[12px]">
                          {isActive ? (
                            <CheckIcon className="h-3 w-3 text-zinc-100" />
                          ) : null}
                        </span>
                        <span
                          className={`min-w-0 flex-1 truncate text-left text-[12px] leading-snug ${isActive ? "text-zinc-100" : "text-zinc-200"}`}
                        >
                          {f.label}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {filteredFonts.length === 0 ? (
                <p className="cursor-default px-2 py-2 text-center text-[11px] text-zinc-500">
                  No fonts match “{fontSearch.trim()}”.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div ref={weightTrayRef} className="relative">
            <button
              type="button"
              onClick={toggleWeightDropdown}
              aria-expanded={weightDropdownOpen}
              aria-haspopup="listbox"
              className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl bg-zinc-900 px-3 text-left transition-colors hover:bg-zinc-800"
            >
              <span className="min-w-0 truncate text-sm text-zinc-100">
                {weightLabel(
                  weights.includes(selected.fontWeight)
                    ? selected.fontWeight
                    : (weights[0] ?? 400),
                )}
              </span>
              <ChevronDownIcon
                className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${weightDropdownOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {weightDropdownOpen ? (
              <ul role="listbox" className={`${dropdownBelow} w-max min-w-full py-1`}>
                {weights.map((w) => {
                  const isActive = selected.fontWeight === w;
                  return (
                    <li key={w} role="none">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => {
                          updateTextLayer(selected.id, { fontWeight: w });
                          closeWeightDropdown();
                        }}
                        className={`flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left text-[12px] transition-colors ${
                          isActive
                            ? "bg-zinc-800/95 text-zinc-100"
                            : "text-zinc-200 hover:bg-zinc-800/60"
                        }`}
                      >
                        <span className="flex w-5 shrink-0 justify-center">
                          {isActive ? (
                            <CheckIcon className="h-3 w-3" aria-hidden />
                          ) : null}
                        </span>
                        <span className="min-w-0 truncate">
                          {weightLabel(w)}
                        </span>
                        <span className="ml-auto font-mono text-[10px] text-zinc-500">
                          {w}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <div ref={sizeTrayRef} className="relative">
            <div
              className={"flex h-10 overflow-hidden rounded-xl bg-zinc-900 transition-colors focus-within:bg-zinc-800"}
            >
              <div className="flex min-w-0 flex-1 items-center px-3">
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Font size in pixels"
                  value={sizeDraft}
                  onChange={(e) => setSizeDraft(e.target.value)}
                  onBlur={commitSizeDraft}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  className="w-full min-w-0 flex-1 cursor-text bg-transparent text-sm tabular-nums text-zinc-100 outline-none"
                  placeholder="px"
                />
              </div>
              <div
                className="w-px shrink-0 self-stretch bg-zinc-700"
                aria-hidden
              />
              <button
                type="button"
                aria-label="Size presets"
                onMouseDown={(e) => e.preventDefault()}
                onClick={toggleSizeDropdown}
                className="flex w-8 shrink-0 cursor-pointer items-center justify-center text-zinc-500 hover:bg-zinc-800/70"
              >
                <ChevronDownIcon
                  className={`h-3.5 w-3.5 transition-transform ${sizeDropdownOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
            </div>
            {sizeDropdownOpen ? (
              <ul
                role="listbox"
                className={`${dropdownBelow} font-mono text-[11px]`}
              >
                {STAMP_FONT_SIZES.map((px) => (
                  <li key={px} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected.fontSize === px}
                      onClick={() => {
                        updateTextLayer(selected.id, { fontSize: px });
                        setSizeDraft(String(px));
                        closeSizeDropdown();
                      }}
                      className={`flex w-full cursor-pointer items-center gap-2 px-2 py-1 text-left tabular-nums transition-colors ${
                        selected.fontSize === px
                          ? "bg-zinc-800/95 text-zinc-100"
                          : "hover:bg-zinc-800/60"
                      }`}
                    >
                      <span className="flex w-5 justify-center">
                        {selected.fontSize === px ? (
                          <CheckIcon className="h-3 w-3" aria-hidden />
                        ) : null}
                      </span>
                      {px}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

      </div>
      </section>

      <section className="space-y-1.5">
        <div className="space-y-1.5">
          <h2 className="px-1 pt-1 text-sm text-ink-soft">Color</h2>
          {renderColor(selected.color, (color) =>
            updateTextLayer(selected.id, { color }),
          )}
        </div>
      </section>
    </div>
  );
}
