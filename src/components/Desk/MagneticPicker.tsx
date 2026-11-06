import { useEffect, useState, type PointerEvent, type ReactNode } from "react";
import { useDialKit } from "dialkit";
import { motion, useSpring, type SpringOptions } from "framer-motion";

import { useStampEditor } from "../../hooks/useStampEditor";
import { DESK_BOUNCE, useVelocityBlur } from "../../utils/deskMotion";
import { ColorPickerPortal } from "../UI/ColorPickerPortal";

const FILLS = [
  { hex: "#00cc55", name: "Clover" },
  { hex: "#ff271f", name: "Poppy" },
  { hex: "#ff5a24", name: "Marigold" },
  { hex: "#ffe122", name: "Buttercup" },
  { hex: "#ff31c6", name: "Peony" },
  { hex: "#3b84ee", name: "Cornflower" },
  { hex: "#1c1c1e", name: "Ink" },
  { hex: "#ffffff", name: "White" },
] as const;

const BOX = 184;
const RING = 58;
const CHIP = 32;

const CENTER_INDEX = FILLS.length;

const SPOTS = [
  ...FILLS.map((_, i) => {
    const a = (i / FILLS.length) * Math.PI * 2 - Math.PI / 2;
    return { x: RING * Math.cos(a), y: RING * Math.sin(a) };
  }),
  { x: 0, y: 0 },
];

type Point = { x: number; y: number };
type Magnet = { swell: number; push: number; pull: number; pullRange: number };

// pressed chip swells, the rest shove away from it, and all of them lean toward the pointer
function placeChip(
  index: number,
  selected: number,
  pointer: Point | null,
  { swell, push: pushBy, pull, pullRange }: Magnet,
) {
  const spot = SPOTS[index]!;
  let { x, y } = spot;
  let scale = index === selected ? swell : 1;

  if (index !== selected) {
    const origin = SPOTS[selected]!;
    const dx = spot.x - origin.x;
    const dy = spot.y - origin.y;
    const dist = Math.hypot(dx, dy);
    const push = pushBy * Math.max(0, 1 - dist / (RING * 2));
    x += (dx / dist) * push;
    y += (dy / dist) * push;
  }

  if (pointer) {
    const dx = pointer.x - spot.x;
    const dy = pointer.y - spot.y;
    const near = Math.max(0, 1 - Math.hypot(dx, dy) / pullRange);
    x += dx * pull * near;
    y += dy * pull * near;
    scale += 0.14 * near;
  }

  return { x, y, scale };
}

function Chip({
  spring,
  target,
  label,
  selected,
  onClick,
  background,
  children,
}: {
  spring: SpringOptions;
  target: { x: number; y: number; scale: number };
  label: string;
  selected: boolean;
  onClick: (el: HTMLElement) => void;
  background?: string;
  children?: ReactNode;
}) {
  const x = useSpring(target.x, spring);
  const y = useSpring(target.y, spring);
  const scale = useSpring(target.scale, spring);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    x.set(target.x);
    y.set(target.y);
    scale.set(target.scale * (held ? 0.85 : 1));
  }, [x, y, scale, target.x, target.y, target.scale, held]);
  const filter = useVelocityBlur(x, y);

  return (
    <motion.button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={selected}
      onClick={(e) => onClick(e.currentTarget)}
      onPointerDown={() => setHeld(true)}
      onPointerUp={() => setHeld(false)}
      onPointerLeave={() => setHeld(false)}
      className="absolute cursor-pointer overflow-hidden rounded-full shadow-[0_2px_8px_rgb(0_0_0/0.18),inset_0_0_0_1px_rgb(0_0_0/0.06)]"
      style={{
        left: BOX / 2 - CHIP / 2,
        top: BOX / 2 - CHIP / 2,
        width: CHIP,
        height: CHIP,
        x,
        y,
        scale,
        filter,
        background,
        zIndex: selected ? 2 : 1,
      }}
    >
      {children}
    </motion.button>
  );
}

export function MagneticPicker() {
  const { stampColor, pickSolidStampColor, backgroundAsset } = useStampEditor();
  const magnet = useDialKit(
    "Color picker",
    {
      spring: { type: "spring", visualDuration: 0.35, bounce: DESK_BOUNCE },
      size: [1.25, 0.6, 1.8, 0.05],
      swell: [1.5, 1, 2.2, 0.05],
      push: [4, 0, 40, 1],
      pull: [0.24, 0, 0.6, 0.01],
      pullRange: [86, 30, 140, 2],
    },
    { id: "color-picker-v2", persist: true },
  );
  const chipSpring = magnet.spring as SpringOptions;
  const [pointer, setPointer] = useState<Point | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);

  const match = FILLS.findIndex((f) => f.hex === stampColor.toLowerCase());
  const selected = backgroundAsset || match < 0 ? CENTER_INDEX : match;

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const box = e.currentTarget.getBoundingClientRect();
    setPointer({
      x: (e.clientX - box.left - box.width / 2) / magnet.size,
      y: (e.clientY - box.top - box.height / 2) / magnet.size,
    });
  };

  return (
    <div
      role="group"
      aria-label="Stamp fill"
      onPointerMove={onPointerMove}
      onPointerLeave={() => setPointer(null)}
      className="relative"
      style={{
        width: BOX,
        height: BOX,
        transform: `scale(${magnet.size})`,
        transformOrigin: "bottom right",
      }}
    >
      {FILLS.map(({ hex, name }, i) => (
        <Chip
          key={hex}
          spring={chipSpring}
          target={placeChip(i, selected, pointer, magnet)}
          label={name}
          selected={selected === i}
          background={hex}
          onClick={() => {
            void pickSolidStampColor(hex);
            setPickerAnchor(null);
          }}
        />
      ))}

      <Chip
        spring={chipSpring}
        target={placeChip(CENTER_INDEX, selected, pointer, magnet)}
        label="Custom color"
        selected={selected === CENTER_INDEX}
        background={
          backgroundAsset
            ? undefined
            : match < 0
              ? stampColor
              : "conic-gradient(#ff271f, #ffe122, #00cc55, #3b84ee, #ff31c6, #ff271f)"
        }
        onClick={(el) => setPickerAnchor(pickerAnchor ? null : el)}
      >
        {backgroundAsset ? (
          <img
            src={backgroundAsset.src}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
      </Chip>

      {pickerAnchor ? (
        <ColorPickerPortal
          anchorEl={pickerAnchor}
          colorHex={stampColor}
          onPick={(hex) => void pickSolidStampColor(hex)}
          onClose={() => setPickerAnchor(null)}
        />
      ) : null}
    </div>
  );
}
