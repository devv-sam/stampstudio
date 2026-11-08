import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type SVGProps,
} from "react";

import {
  arcPath,
  DISC_TEXT_SCALE,
  fitted,
  frameBox,
  frameSnapPoints,
  FRAME_MAX_SIZE,
  FRAME_MIN_SIZE,
  isStraight,
  moveItem,
  nearestSlot,
  snapFramePoint,
  snapRotation,
  STRAIGHT,
  straightLines,
  trackLines,
  type DiscFrameItem,
  type DiscGeometry,
  type DiscSlot,
  type DiscTextItem,
  type TrackSlot,
} from "../../utils/discText";

// the stamp's selection look, sizes in screen px
const ACCENT = "#3b84ee";
const CORNER_SIZE = 6;
const CORNER_HIT = 14;
const ROTATE_ZONE = 22;
const ROTATE_REACH = 12;
// a press that travels less than this is a click, not a drag
const DRAG_SLOP = 3;

type Stroke = Pick<
  SVGProps<SVGElement>,
  "stroke" | "strokeWidth" | "strokeDasharray" | "fill"
>;

// a dark line under white dashes reads on any disc color
function TwoTone({
  active = false,
  shape,
}: {
  active?: boolean;
  shape: (stroke: Stroke) => ReactElement;
}) {
  return (
    <g>
      {shape({ stroke: "rgb(0 0 0 / 0.35)", strokeWidth: 0.45, fill: "none" })}
      {shape(
        active
          ? {
              stroke: "#fff",
              strokeWidth: 0.35,
              fill: "rgb(255 255 255 / 0.2)",
            }
          : {
              stroke: "#fff",
              strokeWidth: 0.25,
              strokeDasharray: "0.8 0.8",
              fill: "none",
            },
      )}
    </g>
  );
}

/** the stamp's gizmo: outline, square corners that scale, rotate just outside them */
function FrameGizmo({
  frame,
  unitsPerPx: u,
  onStart,
}: {
  frame: DiscFrameItem;
  unitsPerPx: number;
  onStart: (e: ReactPointerEvent, mode: "scale" | "rotate") => void;
}) {
  const b = frameBox(frame);
  const corners = [
    [-1, -1, "nwse-resize"],
    [1, -1, "nesw-resize"],
    [1, 1, "nwse-resize"],
    [-1, 1, "nesw-resize"],
  ] as const;
  return (
    <g transform={`rotate(${frame.rotation} ${b.cx} ${b.cy})`}>
      {/* white under the accent, so the outline reads on a cornflower disc too */}
      {[
        { stroke: "#fff", width: 3.5 },
        { stroke: ACCENT, width: 1.5 },
      ].map(({ stroke, width }) => (
        <rect
          key={stroke}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          fill="none"
          stroke={stroke}
          strokeWidth={width}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {corners.map(([sx, sy]) => (
        <circle
          key={`rotate${sx}${sy}`}
          cx={b.cx + (sx * b.w) / 2 + sx * ROTATE_REACH * u}
          cy={b.cy + (sy * b.h) / 2 + sy * ROTATE_REACH * u}
          r={(ROTATE_ZONE / 2) * u}
          fill="transparent"
          className="pointer-events-auto cursor-crosshair"
          onPointerDown={(e) => onStart(e, "rotate")}
        />
      ))}
      {corners.map(([sx, sy, cursor]) => {
        const cx = b.cx + (sx * b.w) / 2;
        const cy = b.cy + (sy * b.h) / 2;
        return (
          <g key={`scale${sx}${sy}`}>
            <rect
              x={cx - (CORNER_HIT / 2) * u}
              y={cy - (CORNER_HIT / 2) * u}
              width={CORNER_HIT * u}
              height={CORNER_HIT * u}
              fill="transparent"
              className="pointer-events-auto"
              style={{ cursor }}
              onPointerDown={(e) => onStart(e, "scale")}
            />
            <rect
              x={cx - (CORNER_SIZE / 2) * u}
              y={cy - (CORNER_SIZE / 2) * u}
              width={CORNER_SIZE * u}
              height={CORNER_SIZE * u}
              fill="#fff"
              stroke={ACCENT}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              className="pointer-events-none"
            />
          </g>
        );
      })}
    </g>
  );
}

// a circle path, drawn as two arcs
const circleD = (r: number) =>
  `M ${50 - r} 50 a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
/** the disc minus its hole, the cutout punches through frames too */
const ringD = (hole: number) => `${circleD(50)} ${circleD(hole)}`;

type TextDrag = {
  id: string;
  startX: number;
  startY: number;
  moved: boolean;
  from: { slot: DiscSlot; angle: number };
  to: { slot: DiscSlot; angle: number };
};

type FrameDrag = {
  id: string;
  mode: "move" | "scale" | "rotate";
  startX: number;
  startY: number;
  /** pointer at the press, in svg units */
  start: { x: number; y: number };
  base: DiscFrameItem;
  moved: boolean;
  preview: Partial<DiscFrameItem>;
  /** the snap point the frame sits on, for the guide */
  snapped: string | null;
};

export function DiscText({
  items,
  onItemsChange,
  frames,
  onFramesChange,
  onRecropFrame,
  selectedId,
  onSelect,
  geometry,
  unitsPerPx,
  outline = null,
  ghost = false,
}: {
  items: DiscTextItem[];
  onItemsChange: (items: DiscTextItem[]) => void;
  frames: DiscFrameItem[];
  onFramesChange: (frames: DiscFrameItem[]) => void;
  /** double-clicking a frame reopens its crop */
  onRecropFrame: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  geometry: DiscGeometry;
  /** svg units per screen px, so handles keep their on-screen size */
  unitsPerPx: number;
  /** outline mode: letters drawn as strokes in this color */
  outline?: string | null;
  /** shader draws the art, keep grab areas only */
  ghost?: boolean;
}) {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement>(null);

  // window listeners read drags from refs, state only drives the render
  const [drag, setDragState] = useState<TextDrag | null>(null);
  const dragRef = useRef<TextDrag | null>(null);
  const setDrag = (next: TextDrag | null) => {
    dragRef.current = next;
    setDragState(next);
  };
  const [frameDrag, setFrameDragState] = useState<FrameDrag | null>(null);
  const frameDragRef = useRef<FrameDrag | null>(null);
  const setFrameDrag = (next: FrameDrag | null) => {
    frameDragRef.current = next;
    setFrameDragState(next);
  };
  const dragging = drag?.moved ? drag : null;
  const movingFrame = frameDrag?.moved ? frameDrag : null;

  // the live preview: the dragged item already sits where it would land
  const shown = dragging
    ? moveItem(items, dragging.id, dragging.to, dragging.from)
    : items;
  const shownFrames = movingFrame
    ? frames.map((f) =>
        f.id === movingFrame.id ? { ...f, ...movingFrame.preview } : f,
      )
    : frames;

  // latest values for the window listeners
  const live = useRef({
    items,
    onItemsChange,
    frames,
    onFramesChange,
    onSelect,
    geometry,
  });
  useEffect(() => {
    live.current = {
      items,
      onItemsChange,
      frames,
      onFramesChange,
      onSelect,
      geometry,
    };
  });

  const toUnits = (clientX: number, clientY: number) => {
    const box = svgRef.current!.getBoundingClientRect();
    return {
      x: ((clientX - box.left) / box.width) * 100,
      y: ((clientY - box.top) / box.height) * 100,
    };
  };

  // measured box around the selected text, for the dashed selection frame
  const selectedRef = useRef<SVGTextElement>(null);
  const [box, setBox] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    const next = selectedRef.current?.getBBox() ?? null;
    setBox((prev) =>
      prev?.x === next?.x &&
      prev?.y === next?.y &&
      prev?.width === next?.width &&
      prev?.height === next?.height
        ? prev
        : next,
    );
  }, [selectedId, items, geometry, dragging]);

  const dragId = drag?.id;
  useEffect(() => {
    if (!dragId) return;

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || !svgRef.current) return;
      const moved =
        d.moved ||
        Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > DRAG_SLOP;
      if (!moved) return;
      const p = toUnits(e.clientX, e.clientY);
      const { slot, angle } = nearestSlot(live.current.geometry, p.x, p.y);
      setDrag({ ...d, moved, to: { slot, angle } });
    };

    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      const l = live.current;
      if (d.moved) l.onItemsChange(moveItem(l.items, d.id, d.to, d.from));
      l.onSelect(d.id);
      setDrag(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragId]);

  const frameDragKey = frameDrag ? `${frameDrag.id}:${frameDrag.mode}` : null;
  useEffect(() => {
    if (!frameDragKey) return;

    const onMove = (e: PointerEvent) => {
      const d = frameDragRef.current;
      if (!d || !svgRef.current) return;
      const moved =
        d.moved ||
        Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > DRAG_SLOP;
      if (!moved) return;
      const p = toUnits(e.clientX, e.clientY);
      const { base, start } = d;

      if (d.mode === "move") {
        // open placement, pulled onto the center or a text spot when close
        const snap = snapFramePoint(
          live.current.geometry,
          base.x + p.x - start.x,
          base.y + p.y - start.y,
        );
        setFrameDrag({
          ...d,
          moved,
          preview: { x: snap.x, y: snap.y },
          snapped: snap.snapped,
        });
      } else if (d.mode === "scale") {
        // corners scale from the center, so the ratio stays locked
        const from = Math.hypot(start.x - base.x, start.y - base.y) || 1;
        const to = Math.hypot(p.x - base.x, p.y - base.y);
        const size = Math.min(
          FRAME_MAX_SIZE,
          Math.max(FRAME_MIN_SIZE, (base.size * to) / from),
        );
        setFrameDrag({ ...d, moved, preview: { size } });
      } else {
        const from = Math.atan2(start.y - base.y, start.x - base.x);
        const to = Math.atan2(p.y - base.y, p.x - base.x);
        const rotation = snapRotation(
          base.rotation + ((to - from) * 180) / Math.PI,
        );
        setFrameDrag({ ...d, moved, preview: { rotation } });
      }
    };

    const onUp = () => {
      const d = frameDragRef.current;
      if (!d) return;
      const l = live.current;
      if (d.moved) {
        l.onFramesChange(
          l.frames.map((f) => (f.id === d.id ? { ...f, ...d.preview } : f)),
        );
      }
      l.onSelect(d.id);
      setFrameDrag(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [frameDragKey]);

  const startFrameDrag = (
    e: ReactPointerEvent,
    frame: DiscFrameItem,
    mode: FrameDrag["mode"],
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setFrameDrag({
      id: frame.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      start: toUnits(e.clientX, e.clientY),
      base: frame,
      moved: false,
      preview: {},
      snapped: null,
    });
  };

  const selectedFrame = shownFrames.find((f) => f.id === selectedId) ?? null;
  const u = unitsPerPx;

  return (
    <svg
      ref={svgRef}
      aria-label="Disc text and frames"
      viewBox="0 0 100 100"
      className="pointer-events-none absolute inset-0 z-50 h-full w-full overflow-visible"
    >
      {/* snap guides while a frame moves, the one it sits on lights up */}
      {movingFrame?.mode === "move" ? (
        <g>
          {frameSnapPoints(geometry).map((p) => (
            <TwoTone
              key={p.id}
              active={movingFrame.snapped === p.id}
              shape={(stroke) => (
                <circle cx={p.x} cy={p.y} r={1.6} {...stroke} />
              )}
            />
          ))}
        </g>
      ) : null}

      {/* slot guides while text moves */}
      {dragging ? (
        <g>
          {(["rim", "inner"] as TrackSlot[]).map((slot) => (
            <TwoTone
              key={slot}
              active={dragging.to.slot === slot}
              shape={(stroke) => (
                <circle
                  cx={50}
                  cy={50}
                  r={geometry.tracks[slot]}
                  {...stroke}
                  fill="none"
                />
              )}
            />
          ))}
          {STRAIGHT.map((slot) => (
            <TwoTone
              key={slot}
              active={dragging.to.slot === slot}
              shape={(stroke) => (
                <circle
                  cx={geometry.anchors[slot].x}
                  cy={geometry.anchors[slot].y}
                  r={2.4}
                  {...stroke}
                />
              )}
            />
          ))}
        </g>
      ) : null}

      <defs>
        <clipPath id={`${uid}-ring`}>
          <path d={ringD(geometry.hole)} clipRule="evenodd" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${uid}-ring)`}>
        {shownFrames.map((f) => {
          const b = frameBox(f);
          return (
            <g key={f.id} transform={`rotate(${f.rotation} ${b.cx} ${b.cy})`}>
              {outline ? (
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  fill="transparent"
                  stroke={outline}
                  strokeWidth={0.2}
                  strokeDasharray="1 0.8"
                  className="pointer-events-auto cursor-move"
                  onPointerDown={(e) => startFrameDrag(e, f, "move")}
                />
              ) : (
                <image
                  href={f.src}
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  preserveAspectRatio="none"
                  opacity={ghost && movingFrame?.id !== f.id ? 0 : 1}
                  className="pointer-events-auto cursor-move select-none"
                  onPointerDown={(e) => startFrameDrag(e, f, "move")}
                  onDoubleClick={() => onRecropFrame(f.id)}
                />
              )}
            </g>
          );
        })}
      </g>

      {selectedFrame && !dragging ? (
        <FrameGizmo
          frame={selectedFrame}
          unitsPerPx={u}
          onStart={(e, mode) => startFrameDrag(e, selectedFrame, mode)}
        />
      ) : null}

      <g clipPath={`url(#${uid}-ring)`}>
        {box && selectedId && !dragging && !selectedFrame ? (
          <TwoTone
            shape={(stroke) => (
              <rect
                x={box.x - 1}
                y={box.y - 0.6}
                width={box.width + 2}
                height={box.height + 1.2}
                rx={1}
                {...stroke}
              />
            )}
          />
        ) : null}

        {shown.map((item) => {
          // drawn at the size that fits its spot, the user's size stays on the item
          const t = fitted(item, geometry);
          const selected = t.id === selectedId && !dragging;
          const common = {
            fill:
              outline || (ghost && dragging?.id !== t.id)
                ? "transparent"
                : t.color,
            fontFamily: `'${t.fontFamily}'`,
            fontWeight: t.fontWeight,
            fontSize: t.fontSize / DISC_TEXT_SCALE,
            textAnchor: "middle" as const,
            dominantBaseline: "central" as const,
            // invisible stroke widens the grab area
            stroke: outline ?? "transparent",
            strokeWidth: outline ? 0.12 : 2,
            ref: selected ? selectedRef : undefined,
            className: `pointer-events-auto select-none ${
              drag?.id === t.id ? "cursor-grabbing" : "cursor-grab"
            }`,
            onPointerDown: (e: ReactPointerEvent) => {
              e.stopPropagation();
              e.preventDefault();
              const from = { slot: t.slot, angle: t.angle };
              setDrag({
                id: t.id,
                startX: e.clientX,
                startY: e.clientY,
                moved: false,
                from,
                to: from,
              });
            },
          };

          if (isStraight(t.slot)) {
            return (
              <text key={t.id} {...common}>
                {straightLines(t, geometry.anchors[t.slot]).map((line, i) => (
                  <tspan
                    key={i}
                    x={line.x}
                    y={line.y}
                    textAnchor={line.textAnchor}
                  >
                    {line.text}
                  </tspan>
                ))}
              </text>
            );
          }

          // every line rides its own arc, all inside one text so it drags and selects as one
          const lines = trackLines(t, geometry.tracks[t.slot]);
          return (
            <g key={t.id}>
              {lines.map((line, i) => (
                <path
                  key={i}
                  id={`${uid}-${t.id}-${i}`}
                  d={arcPath(line.r, t.angle)}
                  fill="none"
                />
              ))}
              <text {...common} letterSpacing="0.06em">
                {lines.map((line, i) => (
                  <textPath
                    key={i}
                    href={`#${uid}-${t.id}-${i}`}
                    startOffset="50%"
                  >
                    {line.text}
                  </textPath>
                ))}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
