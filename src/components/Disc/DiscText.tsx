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
  isStraight,
  moveItem,
  nearestSlot,
  STRAIGHT,
  straightLines,
  trackLines,
  type DiscGeometry,
  type DiscSlot,
  type DiscTextItem,
  type TrackSlot,
} from "../../utils/discText";

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
          ? { stroke: "#fff", strokeWidth: 0.35, fill: "rgb(255 255 255 / 0.2)" }
          : { stroke: "#fff", strokeWidth: 0.25, strokeDasharray: "0.8 0.8", fill: "none" },
      )}
    </g>
  );
}

type Drag = {
  id: string;
  startX: number;
  startY: number;
  moved: boolean;
  from: { slot: DiscSlot; angle: number };
  to: { slot: DiscSlot; angle: number };
};

export function DiscText({
  items,
  onItemsChange,
  selectedId,
  onSelect,
  geometry,
  outline = null,
}: {
  items: DiscTextItem[];
  onItemsChange: (items: DiscTextItem[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  geometry: DiscGeometry;
  /** outline mode: letters drawn as strokes in this color */
  outline?: string | null;
}) {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDragState] = useState<Drag | null>(null);
  // window listeners read the drag from here, state only drives the render
  const dragRef = useRef<Drag | null>(null);
  const setDrag = (next: Drag | null) => {
    dragRef.current = next;
    setDragState(next);
  };
  const dragging = drag?.moved ? drag : null;

  // the live preview: the dragged item already sits in the slot it would snap to
  const shown = dragging
    ? moveItem(items, dragging.id, dragging.to, dragging.from)
    : items;

  // latest values for the window listeners
  const live = useRef({ items, onItemsChange, onSelect, geometry });
  useEffect(() => {
    live.current = { items, onItemsChange, onSelect, geometry };
  });

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
      const svg = svgRef.current;
      if (!d || !svg) return;
      const moved =
        d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 3;
      if (!moved) return;
      const box = svg.getBoundingClientRect();
      const x = ((e.clientX - box.left) / box.width) * 100;
      const y = ((e.clientY - box.top) / box.height) * 100;
      const { slot, angle } = nearestSlot(live.current.geometry, x, y);
      setDrag({ ...d, moved, to: { slot, angle } });
    };

    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      const { items: current, onItemsChange: commit, onSelect: select } =
        live.current;
      if (d.moved) commit(moveItem(current, d.id, d.to, d.from));
      select(d.id);
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

  return (
    <svg
      ref={svgRef}
      aria-label="Disc text"
      viewBox="0 0 100 100"
      className="pointer-events-none absolute inset-0 z-50 h-full w-full"
    >
      {/* slot guides, only while dragging */}
      {dragging ? (
        <g>
          {(["rim", "inner"] as TrackSlot[]).map((slot) => (
            <TwoTone
              key={slot}
              active={dragging.to.slot === slot}
              shape={(stroke) => (
                <circle cx={50} cy={50} r={geometry.tracks[slot]} {...stroke} fill="none" />
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

      {box && selectedId && !dragging ? (
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
          fill: outline ? "transparent" : t.color,
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
                <tspan key={i} x={line.x} y={line.y} textAnchor={line.textAnchor}>
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
                <textPath key={i} href={`#${uid}-${t.id}-${i}`} startOffset="50%">
                  {line.text}
                </textPath>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
