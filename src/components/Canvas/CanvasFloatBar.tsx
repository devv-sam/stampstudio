import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
} from "react";

import { useDialKit } from "dialkit";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Eye,
  FlaskConical,
  Frame,
  Image as ImageIcon,
  Library,
  Stamp,
  Type,
} from "lucide-react";

import { useExperiments } from "../../hooks/useExperiments";
import { useImageUploadFlow } from "../../hooks/useImageUploadFlow";
import { useStampEditor } from "../../hooks/useStampEditor";
import { useDeskMotion } from "../../utils/deskMotion";
import { playThunk } from "../../utils/playThunk";
import { Button } from "../UI/Button";
import { DeskDrawer } from "../Desk/DeskDrawer";
import {
  PRESS_DROP_SECONDS,
  StampPress,
  type PressPhase,
} from "../Desk/StampPress";

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
  "rounded-lg px-3 py-1.5 text-sm transition-[color,background-color] duration-200 ease-out";
const chipInactive = "cursor-pointer text-zinc-500 hover:text-zinc-300";
const chipActive = "cursor-default bg-zinc-800 text-zinc-100";

const COPY_LABEL = {
  idle: "Copy",
  copied: "Copied",
  failed: "Couldn't copy",
};

// lucide has no dashed eye, so the outline-off state dashes the regular one
function EyeDashed(props: ComponentProps<typeof Eye>) {
  return <Eye {...props} strokeDasharray="3 2.5" />;
}

type NavTool = {
  label: string;
  icon: ComponentType<{
    size?: number;
    strokeWidth?: number;
    "aria-hidden"?: boolean;
  }>;
  tint: string;
  on?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

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
    outlineMode,
    toggleOutlineMode,
  } = useStampEditor();

  const { blurPop, press, springy } = useDeskMotion();
  const { launch } = useExperiments();
  const nav = useDialKit(
    "Bottom nav",
    {
      buttonSize: [35, 28, 64, 1],
      iconSize: [20, 12, 32, 1],
      iconStroke: [1.75, 1, 3, 0.05],
      buttonRadius: [6, 0, 32, 1],
      gap: [4, 0, 24, 1],
      padding: [6, 0, 24, 1],
      cardRadius: [12, 0, 48, 1],
      dividerHeight: [20, 0, 40, 1],
      dividerSpacing: [4, 0, 24, 1],
      labelGap: [8, 0, 24, 1],
      bottomOffset: [20, 0, 64, 1],
    },
    { id: "bottom-nav-v2", persist: true },
  );
  const frameUpload = useImageUploadFlow({ defaultRole: "frame" });
  const bgUpload = useImageUploadFlow();

  const [exportPopoverOpen, setExportPopoverOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tip, setTip] = useState({
    label: "",
    x: 0,
    visible: false,
    snap: true,
  });
  const [pressPhase, setPressPhase] = useState<PressPhase>("idle");
  const [exportFormat, setExportFormat] = useState<ExportFormatChip>("png");
  const [resolution, setResolution] = useState<ResolutionChip>("4k");
  const [exportBusy, setExportBusy] = useState(false);
  const [exportBanner, setExportBanner] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<keyof typeof COPY_LABEL>("idle");
  const copyTimer = useRef(0);

  const floatRootRef = useRef<HTMLDivElement | null>(null);

  const flashCopy = (next: keyof typeof COPY_LABEL) => {
    setCopyState(next);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopyState("idle"), 1800);
  };

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
    let pressed = false;
    try {
      // copy skips the press, a delayed clipboard write can lose user activation
      if (mode === "download") {
        pressed = true;
        setExportPopoverOpen(false);
        setPressPhase("down");
        playThunk(PRESS_DROP_SECONDS);
        await new Promise((r) =>
          window.setTimeout(r, PRESS_DROP_SECONDS * 1000 + 40),
        );
      }
      if (exportFormat === "png") {
        if (mode === "download") await exportPng(multiplier);
        else await copyPng(multiplier);
      } else {
        if (mode === "download") await exportSvg();
        else await copySvg();
      }
      if (mode === "copy") flashCopy("copied");
      if (pressed) {
        setPressPhase("mark");
        window.setTimeout(() => setPressPhase("idle"), 900);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Export failed — try again";
      if (mode === "copy") flashCopy("failed");
      else showBanner(msg);
      setPressPhase("idle");
    } finally {
      setExportBusy(false);
    }
  };

  /** Escape cancels text placement or closes the open popover. */
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
        if (exportPopoverOpen || drawerOpen) {
          e.preventDefault();
          setExportPopoverOpen(false);
          setDrawerOpen(false);
          return;
        }
        if (textPlacementActive) setTextPlacementActive(false);
      }
    }

    document.addEventListener("keydown", onDocKeyDown, true);
    return () => document.removeEventListener("keydown", onDocKeyDown, true);
  }, [
    textPlacementActive,
    setTextPlacementActive,
    exportPopoverOpen,
    drawerOpen,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "y") return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      e.preventDefault();
      toggleOutlineMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleOutlineMode]);

  useEffect(() => {
    if (!exportPopoverOpen && !drawerOpen) return;

    function onPointerDown(ev: MouseEvent | PointerEvent) {
      const root = floatRootRef.current;
      const t = ev.target as Node | null;
      if (!root || !t || root.contains(t)) return;
      if ((t as Element).closest?.('[role="menu"]')) return;
      setExportPopoverOpen(false);
      setDrawerOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [exportPopoverOpen, drawerOpen]);

  const formatOptions: { id: ExportFormatChip; label: string }[] = [
    { id: "png", label: "PNG" },
    { id: "svg", label: "SVG" },
  ];

  const resolutionOptions: { id: ResolutionChip; label: string }[] = [
    { id: "1080p", label: "1080p" },
    { id: "4k", label: "4K" },
    { id: "6k", label: "6K" },
  ];

  const groups: NavTool[][] = [
    [
      {
        label: "Add text",
        icon: Type,
        tint: "hover:text-cornflower focus-visible:text-cornflower",
        on: "text-cornflower",
        active: textPlacementActive,
        onClick: () => toggleTextPlacementActive(),
      },
      {
        label: "Upload background",
        icon: ImageIcon,
        tint: "hover:text-clover focus-visible:text-clover",
        onClick: () => bgUpload.open(),
      },
      {
        label: "Upload frame",
        icon: Frame,
        tint: "hover:text-marigold focus-visible:text-marigold",
        onClick: () => frameUpload.open(),
      },
    ],
    [
      {
        label: "Outline",
        icon: outlineMode ? Eye : EyeDashed,
        tint: "hover:text-clover focus-visible:text-clover",
        on: "text-clover",
        active: outlineMode,
        onClick: toggleOutlineMode,
      },
      {
        label: "Library",
        icon: Library,
        tint: "hover:text-peony focus-visible:text-peony",
        on: "text-peony",
        active: drawerOpen,
        onClick: () => {
          setExportPopoverOpen(false);
          setDrawerOpen((o) => !o);
        },
      },
      {
        label: "CD designer",
        icon: FlaskConical,
        tint: "hover:text-cornflower focus-visible:text-cornflower",
        onClick: () => launch("cd"),
      },
    ],
    [
      {
        label: "Export",
        icon: Stamp,
        tint: "",
        on: "text-clover",
        active: true,
        onClick: () => {
          setDrawerOpen(false);
          setExportPopoverOpen((o) => !o);
        },
      },
    ],
  ];

  const showTip = (label: string, el: HTMLElement) => {
    if (textPlacementActive) return;
    setTip((t) => ({
      label,
      x: el.offsetLeft + el.offsetWidth / 2,
      visible: true,
      snap: !t.visible,
    }));
  };

  const hideTip = () => setTip((t) => ({ ...t, visible: false }));

  const tipShown =
    tip.visible && !textPlacementActive && !drawerOpen && !exportPopoverOpen;

  return (
    <>
      <div
        ref={floatRootRef}
        className="pointer-events-auto absolute left-1/2 z-40 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-col items-center gap-2"
        style={{ bottom: nav.bottomOffset }}
      >
        <AnimatePresence initial={false}>
          {exportPopoverOpen ? (
            <motion.div
              role="dialog"
              aria-label="Export stamp"
              {...blurPop}
              className="desk-card w-[min(22rem,calc(100vw-2rem))] overflow-hidden"
            >
              <div className="flex gap-6 px-4 pb-4 pt-3.5">
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="text-base">
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
                  <span className="text-base">
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

              <div className="flex gap-1.5 p-1.5 pt-0">
                <Button
                  variant="primary"
                  disabled={exportBusy}
                  onClick={() => runExportAction("download")}
                  className="flex-1"
                >
                  Export
                </Button>
                <Button
                  disabled={exportBusy}
                  onClick={() => runExportAction("copy")}
                  className={`flex-1 ${
                    copyState === "copied"
                      ? "!bg-clover"
                      : copyState === "failed"
                        ? "!bg-poppy !text-[#fff]"
                        : ""
                  }`}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={copyState}
                      className="inline-flex items-center gap-1.5"
                      initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      {copyState === "copied" ? (
                        <Check size={15} aria-hidden />
                      ) : null}
                      {COPY_LABEL[copyState]}
                    </motion.span>
                  </AnimatePresence>
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {drawerOpen ? (
            <motion.div
              role="dialog"
              aria-label="Library"
              {...blurPop}
              className="desk-card w-[min(20rem,calc(100vw-2rem))] p-4"
            >
              <DeskDrawer onRecrop={(asset) => bgUpload.openRecrop(asset)} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div
          className="desk-card relative flex items-center"
          style={{
            gap: nav.gap,
            padding: nav.padding,
            borderRadius: nav.cardRadius,
          }}
          onPointerLeave={hideTip}
          onBlur={hideTip}
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute bottom-full left-0"
            style={{ marginBottom: nav.labelGap }}
            initial={false}
            animate={{
              x: tip.x,
              opacity: tipShown ? 1 : 0,
              filter: tipShown ? "blur(0px)" : "blur(6px)",
            }}
            transition={{
              x: tip.snap ? { duration: 0 } : springy,
              opacity: { duration: 0.14 },
              filter: { duration: 0.18 },
            }}
          >
            <span className="desk-card block -translate-x-1/2 !rounded-xl px-2.5 py-1 text-sm whitespace-nowrap">
              {tip.label}
            </span>
          </motion.div>

          <AnimatePresence>
            {textPlacementActive ? (
              <motion.span
                {...blurPop}
                className="desk-card pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 !rounded-xl px-2.5 py-1 text-sm whitespace-nowrap"
                style={{ marginBottom: nav.labelGap }}
              >
                Click the stamp to place text
              </motion.span>
            ) : null}
          </AnimatePresence>

          {groups.map((group, g) => (
            <Fragment key={group[0]!.label}>
              {g > 0 ? (
                <span
                  aria-hidden
                  className="w-px bg-zinc-700"
                  style={{
                    height: nav.dividerHeight,
                    marginInline: nav.dividerSpacing,
                  }}
                />
              ) : null}
              {group.map(({ label, icon: Icon, tint, on, active, disabled, onClick }) => (
                <motion.button
                  key={label}
                  type="button"
                  {...(disabled ? {} : press)}
                  aria-label={label}
                  aria-disabled={disabled}
                  onClick={onClick}
                  onPointerEnter={(e) => showTip(label, e.currentTarget)}
                  onFocus={(e) => showTip(label, e.currentTarget)}
                  className={`flex shrink-0 items-center justify-center transition-colors duration-150 ${tint} ${
                    disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                  } ${active ? on : "text-ink"}`}
                  style={{
                    width: nav.buttonSize,
                    height: nav.buttonSize,
                    borderRadius: nav.buttonRadius,
                  }}
                >
                  <Icon
                    size={nav.iconSize}
                    strokeWidth={nav.iconStroke}
                    aria-hidden
                  />
                </motion.button>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      {exportBanner ? (
        <div
          className="pointer-events-none absolute bottom-24 left-1/2 z-40 max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl px-3 py-1.5 text-sm bg-poppy text-[#fff]"
          role="status"
        >
          {exportBanner}
        </div>
      ) : null}

      {bgUpload.error ? (
        <div className="pointer-events-none absolute bottom-28 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-poppy px-3 py-1.5 text-sm text-[#fff]">
          {bgUpload.error}
        </div>
      ) : null}

      {frameUpload.error ? (
        <div className="pointer-events-none absolute bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-poppy px-3 py-1.5 text-sm text-[#fff]">
          {frameUpload.error}
        </div>
      ) : null}

      {frameUpload.fileInputElement}
      {frameUpload.overlayElement}
      {bgUpload.fileInputElement}
      {bgUpload.overlayElement}

      <StampPress phase={pressPhase} />
    </>
  );
}
