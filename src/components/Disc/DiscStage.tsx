import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useDiscEditor } from "../../hooks/useDiscEditor";
import { useStampEditor } from "../../hooks/useStampEditor";
import { NOISE_OPACITY } from "../../utils/discExport";
import { discGeometry } from "../../utils/discText";
import { ShaderLayer } from "../Canvas/ShaderLayer";
import { ShaderOriginGizmo } from "../Canvas/ShaderOriginGizmo";
import { RollingNumber } from "../UI/RollingNumber";
import { CropStep } from "../Upload/CropStep";
import { DiscResizeRing } from "./DiscResizeRing";
import { DiscText } from "./DiscText";

const MIN_SIZE = 200;
const OUTLINE = "rgba(28, 28, 30, 0.72)";
// room kept for the resize ring beside the disc and the size readout below it
const RING_ROOM = 24;
const READOUT_ROOM = 56;

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

  return (
    // same stage box as the stamp canvas, so it clears the side panels. the disc panel runs taller on phones
    // isolate keeps the resize ring's z-index inside, so panel popovers stay on top
    <div
      ref={stageRef}
      className="desk-stage isolate flex flex-col items-center justify-center gap-4 max-md:!bottom-[28rem]"
      style={{ containerType: "size" }}
      onPointerDown={() => setSelectedId(null)}
    >
      <div
        className="relative"
        style={{
          width: `min(${size}px, 100cqw - ${RING_ROOM}px, 100cqh - ${READOUT_ROOM}px)`,
        }}
      >
        <div
          ref={discRef}
          className={`aspect-square ${
            outlineMode ? "" : "drop-shadow-[0_10px_24px_rgb(0_0_0/0.18)]"
          }`}
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
                backgroundImage: image ? `url(${image})` : undefined,
              }}
            />
            <ShaderLayer
              rect={{ left: 0, top: 0, width: discPx, height: discPx }}
              imageSrc={image ?? ""}
              stampColor={color}
              activeShader={activeShader}
              shaderParams={shaderParams}
              // stays mounted in outline mode so export can still read it
              opacity={outlineMode ? 0 : noise ? NOISE_OPACITY : 1}
            />
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
        <DiscResizeRing
          diameter={discPx}
          min={MIN_SIZE}
          max={maxPx}
          onResize={setSize}
        />
        <ShaderOriginGizmo round />
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
        />
      </div>

      <p
        className="text-sm tabular-nums text-ink-soft"
        aria-label="Disc diameter in pixels"
      >
        Ø <RollingNumber value={discPx} />
      </p>

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
