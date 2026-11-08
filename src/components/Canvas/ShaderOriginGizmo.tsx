import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { DEFAULT_SHADER_PARAMS } from "../../data/editorDefaults";
import { useStampEditor } from "../../hooks/useStampEditor";

const KEY_STEP = 0.01;
const RING_RADIUS = 44;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Crosshair over the shader layer for moving where intaglio's ripple starts.
 * Sits over the stamp or the disc box. `scale` is the box's css scale, so the
 * handle stays the same size on screen. `round` clips the lines to a disc.
 */
export function ShaderOriginGizmo({
  scale = 1,
  round = false,
}: {
  scale?: number;
  round?: boolean;
}) {
  const {
    activeShader,
    shaderMenuOpen,
    shaderParams,
    updateShaderParam,
    outlineMode,
  } = useStampEditor();
  const rootRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  if (activeShader !== "intaglio" || !shaderMenuOpen || outlineMode) return null;

  const { originX: x, originY: y, ink } = shaderParams.intaglio;

  const moveTo = (nx: number, ny: number) => {
    updateShaderParam("intaglio", "originX", clamp01(nx));
    updateShaderParam("intaglio", "originY", clamp01(ny));
  };

  const fromPointer = (e: PointerEvent<HTMLElement>) => {
    const box = rootRef.current!.getBoundingClientRect();
    moveTo(
      (e.clientX - box.left) / box.width,
      (e.clientY - box.top) / box.height,
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[e.key];
    if (!step) return;
    e.preventDefault();
    moveTo(x + step[0]! * KEY_STEP, y + step[1]! * KEY_STEP);
  };

  // a dark line under a white one reads on light paper and dark ink alike
  const tones = [
    { stroke: "rgb(0 0 0 / 0.35)", width: 3 },
    { stroke: "rgb(255 255 255 / 0.95)", width: 1.25 },
  ];

  return (
    <div ref={rootRef} data-shader-gizmo className="pointer-events-none absolute inset-0 z-[21]">
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        style={{
          opacity: dragging ? 1 : 0.85,
          clipPath: round ? "circle(50%)" : undefined,
        }}
      >
        {tones.map(({ stroke, width }) => (
          <g key={stroke} fill="none" stroke={stroke} strokeWidth={width / scale}>
            <line x1="0" x2="100%" y1={`${y * 100}%`} y2={`${y * 100}%`} />
            <line x1={`${x * 100}%`} x2={`${x * 100}%`} y1="0" y2="100%" />
            <circle
              cx={`${x * 100}%`}
              cy={`${y * 100}%`}
              r={RING_RADIUS / scale}
              strokeDasharray={`${3 / scale} ${4 / scale}`}
            />
          </g>
        ))}
      </svg>

      <button
        type="button"
        aria-label="Ripple source"
        title="Drag to move where the ripple starts. Double-click to reset."
        className={`pointer-events-auto absolute h-[18px] w-[18px] touch-none rounded-full border-[3px] border-[#fff] shadow-[0_0_0_2px_var(--color-cornflower),0_2px_6px_rgb(0_0_0/0.35)] ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          background: ink,
          transform: `translate(-50%, -50%) scale(${1 / scale})`,
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (dragging) fromPointer(e);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onDoubleClick={() =>
          moveTo(
            DEFAULT_SHADER_PARAMS.intaglio.originX,
            DEFAULT_SHADER_PARAMS.intaglio.originY,
          )
        }
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
