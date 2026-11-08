import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useDiscEditor } from "../../hooks/useDiscEditor";
import { useStampEditor } from "../../hooks/useStampEditor";
import { discArtUrl, NOISE_OPACITY } from "../../utils/discExport";
import { discGeometry } from "../../utils/discText";
import { ShaderLayer } from "../Canvas/ShaderLayer";
import { ShaderOriginGizmo } from "../Canvas/ShaderOriginGizmo";
import { Button } from "../UI/Button";
import { RollingNumber } from "../UI/RollingNumber";
import { CropStep } from "../Upload/CropStep";
import { DiscResizeRing } from "./DiscResizeRing";
import { DiscText } from "./DiscText";

const MIN_SIZE = 200;
const OUTLINE = "rgba(28, 28, 30, 0.72)";
// room kept for the resize ring beside the disc and the size readout below it
const RING_ROOM = 24;
const READOUT_ROOM = 56;
// flattened art size for the shader
const ART_SIZE = 1024;
// 3d view, angles in deg
const IDLE_SPIN = 20; // per s
const DRAG_RATE = 0.4; // per px
const FRICTION = 2.5;
const RIM = 2.4; // px
const BACK =
  "repeating-radial-gradient(circle, rgb(255 255 255 / 0.1) 0 2px, transparent 2px 10px), conic-gradient(#dcdde1, #a9abb2, #f1f2f4, #b4b6bc, #dcdde1)";

/** the disc in the middle of the desk, shown in place of the stamp canvas */
export function DiscStage() {
  const {
    size,
    setSize,
    hole,
    rings,
    spread,
    color,
    image,
    applyCrop,
    previewRef,
    crop,
    closeCrop,
    recropFrame,
    texts,
    setTexts,
    frames,
    setFrames,
    selectedId,
    setSelectedId,
    removeSelected,
    previewing,
    setPreviewing,
  } = useDiscEditor();
  // the left shader rail drives the disc too
  const { activeShader, shaderParams, outlineMode } = useStampEditor();

  const discRef = useRef<HTMLDivElement>(null);
  const [discPx, setDiscPx] = useState(0);
  useLayoutEffect(() => {
    const el = discRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setDiscPx(el.offsetWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // biggest disc the stage fits, so the ring never drags past what shows
  const stageRef = useRef<HTMLDivElement>(null);
  const [maxPx, setMaxPx] = useState(560);
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setMaxPx(
        Math.max(
          MIN_SIZE,
          Math.floor(
            Math.min(
              el.clientWidth - RING_ROOM,
              el.clientHeight - READOUT_ROOM,
            ),
          ),
        ),
      ),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!previewing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewing(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewing, setPreviewing]);

  const [view3d, setView3d] = useState(false);
  const tiltRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const spin3d = previewing && view3d;
  useEffect(() => {
    const el = tiltRef.current;
    const stage = stageRef.current;
    if (!spin3d || !el || !stage) return;
    let rx = 0;
    let ry = 0;
    let vx = 0;
    let vy = IDLE_SPIN;
    let drag: { x: number; y: number; t: number } | null = null;
    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, t: performance.now() };
      vx = vy = 0;
      stage.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const now = performance.now();
      const dx = (e.clientX - drag.x) * DRAG_RATE;
      const dy = (e.clientY - drag.y) * -DRAG_RATE;
      const dt = Math.max(0.008, (now - drag.t) / 1000);
      ry += dx;
      rx += dy;
      // smoothed fling speed
      vy = vy * 0.5 + (dx / dt) * 0.5;
      vx = vx * 0.5 + (dy / dt) * 0.5;
      drag = { x: e.clientX, y: e.clientY, t: now };
    };
    const onUp = () => {
      // held still, no fling
      if (drag && performance.now() - drag.t > 80) vx = vy = 0;
      drag = null;
    };
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.064, (now - last) / 1000);
      last = now;
      if (!drag) {
        const f = Math.exp(-dt * FRICTION);
        vy = IDLE_SPIN + (vy - IDLE_SPIN) * f;
        vx *= f;
        rx += vx * dt;
        ry += vy * dt;
        // settle upright
        const upright = Math.round(rx / 360) * 360;
        rx += (upright - rx) * (1 - Math.exp(-dt * 1.2));
      }
      el.style.transform = `perspective(1400px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      sheenRef.current?.style.setProperty("--sheen", `${ry * 2 + rx}deg`);
      raf = requestAnimationFrame(tick);
    };
    el.style.transition = "none";
    raf = requestAnimationFrame(tick);
    stage.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.style.transition = "transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1)";
      el.style.transform = "";
    };
  }, [spin3d]);

  // delete or backspace removes the selected text, unless you're typing
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select")) return;
      if (e.key === "Delete" || e.key === "Backspace") removeSelected();
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, removeSelected, setSelectedId]);

  const holeStop = `${hole}%`;
  // svg units are % of the diameter, so the hole radius is hole / 2
  const ringRadii = Array.from(
    { length: rings },
    (_, i) => hole / 2 + spread * (i + 1),
  ).filter((r) => r < 49);

  const noise =
    activeShader === "image-dithering" &&
    shaderParams["image-dithering"].preset === "noise";

  // shader reads one image, so flatten text and frames in
  const shadeArt = !!activeShader && (texts.length > 0 || frames.length > 0);
  const [artUrl, setArtUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!shadeArt) return;
    let cancelled = false;
    discArtUrl({ hole, rings, spread, color, image, texts, frames }, ART_SIZE)
      .then((url) => !cancelled && setArtUrl(url))
      .catch((err) => console.error("[stampstudio] disc art failed", err));
    return () => {
      cancelled = true;
    };
  }, [shadeArt, hole, rings, spread, color, image, texts, frames]);
  const shaded = shadeArt && !!artUrl;
  const art = shaded ? artUrl : image;

  return (
    // same stage box as the stamp canvas, so it clears the side panels. the disc panel runs taller on phones
    // isolate keeps the resize ring's z-index inside, so panel popovers stay on top
    <div
      ref={stageRef}
      className={`desk-stage isolate flex flex-col items-center justify-center gap-4 ${
        previewing ? "max-md:!bottom-[5.5rem]" : "max-md:!bottom-[28rem]"
      } ${spin3d ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
      style={{ containerType: "size" }}
      onPointerDown={() => setSelectedId(null)}
    >
      <div
        ref={tiltRef}
        inert={previewing}
        // off the face plane, hidden from behind
        className={`relative ${
          spin3d
            ? "[&>svg]:[backface-visibility:hidden] [&>svg]:[transform:translateZ(0.5px)]"
            : ""
        }`}
        style={{
          width: `min(${size}px, 100cqw - ${RING_ROOM}px, 100cqh - ${READOUT_ROOM}px)`,
          transformStyle: spin3d ? "preserve-3d" : undefined,
        }}
      >
        {/* rim layers, then the silver back */}
        {spin3d
          ? [1, 2, 3, 4].map((i) => (
              <div
                key={i}
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{
                  transform:
                    i === 4
                      ? `rotateY(180deg) translateZ(${RIM}px)`
                      : `translateZ(${(-i * RIM) / 4}px)`,
                  backfaceVisibility: i === 4 ? "hidden" : undefined,
                  background:
                    i === 4 ? BACK : "linear-gradient(135deg, #f4f4f6, #8e8e96)",
                  mask: `radial-gradient(circle closest-side, transparent ${holeStop}, #000 calc(${holeStop} + 0.5px))`,
                }}
              />
            ))
          : null}
        <div
          ref={discRef}
          className={`aspect-square ${
            outlineMode || spin3d
              ? ""
              : "drop-shadow-[0_10px_24px_rgb(0_0_0/0.18)]"
          }`}
          style={{ backfaceVisibility: spin3d ? "hidden" : undefined }}
        >
          <div
            ref={previewRef}
            aria-label="Disc preview"
            className="relative h-full w-full overflow-hidden rounded-full"
            style={{
              // closest-side makes 100% the disc radius, so hole% is a diameter ratio
              mask: `radial-gradient(circle closest-side, transparent ${holeStop}, #000 calc(${holeStop} + 0.5px))`,
            }}
          >
            <div
              className={`absolute inset-0 bg-cover bg-center ${
                outlineMode ? "opacity-0" : ""
              }`}
              style={{
                backgroundColor: color,
                backgroundImage: art ? `url(${art})` : undefined,
              }}
            />
            <ShaderLayer
              rect={{ left: 0, top: 0, width: discPx, height: discPx }}
              imageSrc={art ?? ""}
              stampColor={color}
              activeShader={activeShader}
              shaderParams={shaderParams}
              // stays mounted in outline mode so export can still read it
              opacity={outlineMode ? 0 : noise ? NOISE_OPACITY : 1}
            />
            {spin3d ? (
              <div
                ref={sheenRef}
                aria-hidden
                className="pointer-events-none absolute inset-0 z-30 opacity-40 mix-blend-overlay"
                style={{
                  background:
                    "conic-gradient(from var(--sheen, 0deg), #ff8a8a, #ffe58a, #8affb0, #8ad8ff, #c58aff, #ff8a8a)",
                }}
              />
            ) : null}
            <svg
              aria-hidden
              viewBox="0 0 100 100"
              className="pointer-events-none absolute inset-0 z-40 h-full w-full"
            >
              {outlineMode ? (
                <g fill="none" stroke={OUTLINE} strokeWidth={1}>
                  <circle
                    cx={50}
                    cy={50}
                    r={49.9}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={50}
                    cy={50}
                    r={hole / 2}
                    vectorEffect="non-scaling-stroke"
                  />
                  {ringRadii.map((r) => (
                    <circle
                      key={r}
                      cx={50}
                      cy={50}
                      r={r}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              ) : null}
              {(outlineMode ? [] : ringRadii).map((r) => (
                <g key={r} fill="none">
                  {/* a dark groove with a faint lit edge just outside it */}
                  <circle
                    cx={50}
                    cy={50}
                    r={r}
                    stroke="rgb(0 0 0 / 0.35)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={50}
                    cy={50}
                    r={r + 0.25}
                    stroke="rgb(255 255 255 / 0.12)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ))}
            </svg>
          </div>
        </div>
        {previewing ? null : (
          <>
            <DiscResizeRing
              diameter={discPx}
              min={MIN_SIZE}
              max={maxPx}
              onResize={setSize}
            />
            <ShaderOriginGizmo round />
          </>
        )}
        {/* outside the disc's mask, so handles past the rim stay grabbable. it clips its own art */}
        <DiscText
          items={texts}
          onItemsChange={setTexts}
          frames={frames}
          onFramesChange={setFrames}
          onRecropFrame={recropFrame}
          unitsPerPx={discPx ? 100 / discPx : 0.25}
          selectedId={selectedId}
          onSelect={setSelectedId}
          geometry={discGeometry(hole, rings, spread)}
          outline={outlineMode ? OUTLINE : null}
          ghost={shaded && !outlineMode}
        />
      </div>

      {previewing ? (
        // bottom nav spot
        <div className="desk-card fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 gap-1 p-1">
          <Button
            variant={view3d ? "primaryBlue" : "ghost"}
            aria-pressed={view3d}
            onClick={() => setView3d((on) => !on)}
          >
            3D
          </Button>
          <Button variant="ghost" onClick={() => setPreviewing(false)}>
            Done
          </Button>
        </div>
      ) : (
        <p
          className="text-sm tabular-nums text-ink-soft"
          aria-label="Disc diameter in pixels"
        >
          Ø <RollingNumber value={discPx} />
        </p>
      )}

      {crop ? (
        <CropStep
          // a remount per crop, so a recrop starts fresh
          key={crop.kind === "frame" ? (crop.frameId ?? "new-frame") : "image"}
          round={crop.kind === "image"}
          freeform={crop.kind === "frame"}
          src={crop.src}
          confirmLabel={crop.kind === "image" ? "Use image" : "Use frame"}
          onCancel={closeCrop}
          onConfirm={(dataUrl, width, height) => {
            applyCrop(dataUrl, width, height);
            closeCrop();
          }}
        />
      ) : null}
    </div>
  );
}
