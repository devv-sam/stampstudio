import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useDiscEditor } from "../../hooks/useDiscEditor";
import { useStampEditor } from "../../hooks/useStampEditor";
import { discGeometry } from "../../utils/discText";
import { ShaderLayer } from "../Canvas/ShaderLayer";
import { CropStep } from "../Upload/CropStep";
import { DiscText } from "./DiscText";

// the noise preset reads too heavy on a disc, so it runs at 75%
const NOISE_OPACITY = 0.75;

/** the disc in the middle of the desk, shown in place of the stamp canvas */
export function DiscStage() {
  const {
    size,
    hole,
    rings,
    spread,
    color,
    image,
    setImage,
    cropSrc,
    closeCrop,
    texts,
    setTexts,
    selectedId,
    setSelectedId,
    removeSelected,
  } = useDiscEditor();
  // the left shader rail drives the disc too
  const { activeShader, shaderParams } = useStampEditor();

  const discRef = useRef<HTMLDivElement>(null);
  const [discPx, setDiscPx] = useState(0);
  useLayoutEffect(() => {
    const el = discRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setDiscPx(el.offsetWidth));
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
    <div
      className="desk-stage z-10 flex items-center justify-center max-md:!bottom-[28rem]"
      style={{ containerType: "size" }}
      onPointerDown={() => setSelectedId(null)}
    >
      <div
        ref={discRef}
        className="aspect-square drop-shadow-[0_10px_24px_rgb(0_0_0/0.18)]"
        style={{ width: `min(${size}px, 100cqw, 100cqh)` }}
      >
        <div
          aria-label="Disc preview"
          className="relative h-full w-full overflow-hidden rounded-full"
          style={{
            // closest-side makes 100% the disc radius, so hole% is a diameter ratio
            mask: `radial-gradient(circle closest-side, transparent ${holeStop}, #000 calc(${holeStop} + 0.5px))`,
          }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
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
            opacity={noise ? NOISE_OPACITY : 1}
          />
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-0 z-40 h-full w-full"
          >
            {ringRadii.map((r) => (
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
          <DiscText
            items={texts}
            onItemsChange={setTexts}
            selectedId={selectedId}
            onSelect={setSelectedId}
            geometry={discGeometry(hole, rings, spread)}
          />
        </div>
      </div>

      {cropSrc ? (
        <CropStep
          round
          src={cropSrc}
          confirmLabel="Use image"
          onCancel={closeCrop}
          onConfirm={(dataUrl) => {
            setImage(dataUrl);
            closeCrop();
          }}
        />
      ) : null}
    </div>
  );
}
