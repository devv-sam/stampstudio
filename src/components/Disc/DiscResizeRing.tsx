import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

// same feel as the stamp's resize rail, bent into a circle
const RING_GAP = 10;
const GRIP_LENGTH = 56;
const GRIP_PRESSED_LENGTH = 38;
const HIT_WIDTH = 36;
const KEY_STEP = 4;
const GRIP_SPRING = { visualDuration: 0.18, bounce: 0.15 };

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** an arc of `length` px on a circle of radius r, centered at `deg` (0 = top, clockwise) */
function arcD(c: number, r: number, deg: number, length: number) {
  const half = length / r / 2;
  const a = (deg * Math.PI) / 180;
  const at = (t: number) => `${c + r * Math.sin(t)} ${c - r * Math.cos(t)}`;
  return `M ${at(a - half)} A ${r} ${r} 0 0 1 ${at(a + half)}`;
}

export function DiscResizeRing({
  diameter,
  min,
  max,
  onResize,
}: {
  diameter: number;
  min: number;
  max: number;
  onResize: (diameter: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hot, setHot] = useState(false);
  const drag = useRef<{ dist: number; diameter: number } | null>(null);

  const center = useMotionValue(diameter / 2);
  const radius = useMotionValue(diameter / 2 + RING_GAP);
  useEffect(() => {
    center.set(diameter / 2);
    radius.set(diameter / 2 + RING_GAP);
  }, [center, radius, diameter]);

  const angle = useSpring(90, GRIP_SPRING);
  const gripLength = useSpring(GRIP_LENGTH, GRIP_SPRING);
  const gripD = useTransform(
    [center, radius, angle, gripLength],
    ([c, r, a, l]: number[]) => arcD(c!, r!, a!, l!),
  );

  const pointer = (e: PointerEvent<Element>) => {
    const box = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - (box.left + box.width / 2);
    const y = e.clientY - (box.top + box.height / 2);
    return {
      dist: Math.hypot(x, y),
      deg: (Math.atan2(x, -y) * 180) / Math.PI,
    };
  };

  // takes the short way round, so the grip never spins backwards across the top
  const aimGrip = (deg: number, jump = false) => {
    const current = angle.get();
    const next = current + ((((deg - current) % 360) + 540) % 360) - 180;
    if (jump) angle.jump(next);
    else angle.set(next);
  };

  const onPointerMove = (e: PointerEvent<Element>) => {
    const { dist, deg } = pointer(e);
    aimGrip(deg);
    const start = drag.current;
    if (!start) return;
    // both sides of the disc move, so the edge tracks the pointer
    onResize(Math.round(clamp(start.diameter + (dist - start.dist) * 2, min, max)));
  };

  const onPointerDown = (e: PointerEvent<Element>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { dist: pointer(e).dist, diameter };
    gripLength.set(GRIP_PRESSED_LENGTH);
    setHot(true);
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    gripLength.set(GRIP_LENGTH);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[
      e.key
    ];
    if (!by) return;
    e.preventDefault();
    onResize(clamp(diameter + by * KEY_STEP, min, max));
  };

  const r = diameter / 2 + RING_GAP;

  return (
    <>
      <svg
        ref={svgRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[22] h-full w-full overflow-visible"
      >
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={r}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="0.1 6"
          className={`transition-[stroke] duration-150 ${
            hot ? "stroke-ink/60" : "stroke-ink/20"
          }`}
        />
        <motion.path
          d={gripD}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          className="stroke-ink"
          initial={false}
          animate={{ opacity: hot ? 1 : 0 }}
          transition={{ duration: 0.12 }}
        />
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={r}
          fill="none"
          stroke="transparent"
          strokeWidth={HIT_WIDTH}
          className="cursor-none touch-none"
          style={{ pointerEvents: "stroke" }}
          onPointerEnter={(e) => {
            aimGrip(pointer(e).deg, true);
            setHot(true);
          }}
          onPointerLeave={() => {
            if (!drag.current) setHot(false);
          }}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </svg>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Disc size"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={diameter}
        className="sr-only"
        onKeyDown={onKeyDown}
        onFocus={() => setHot(true)}
        onBlur={() => setHot(false)}
      />
    </>
  );
}
