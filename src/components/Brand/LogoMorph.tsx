import { useDialKit } from "dialkit";
import { useMemo, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "framer-motion";

import {
  DESK_BOUNCE,
  toTransition,
  useVelocityBlur,
} from "../../utils/deskMotion";
import {
  buildLogoShapes,
  LOGO_VIEWBOX,
  mixOutlines,
  outlineToPath,
} from "../../utils/logoShapes";

export function LogoMorph() {
  const shapes = useMemo(() => buildLogoShapes(), []);
  const reduced = useReducedMotion();
  const dial = useDialKit(
    "Logo",
    {
      morph: { type: "spring", visualDuration: 0.5, bounce: DESK_BOUNCE },
      spin: [90, 0, 360, 90],
      squash: [0.8, 0.5, 1, 0.01],
      maxBlur: [3, 0, 12, 0.5],
    },
    { id: "logo-v2", persist: true },
  );
  const [index, setIndex] = useState(0);

  const d = useMotionValue(outlineToPath(shapes[0]!.outline));
  const rotate = useMotionValue(0);
  const scale = useMotionValue(1);
  const filter = useVelocityBlur(rotate, scale, dial.maxBlur);

  const shown = useRef(shapes[0]!.outline);
  const running = useRef<AnimationPlaybackControls | null>(null);
  const turn = useRef(0);

  const morph = () => {
    const next = (index + 1) % shapes.length;
    const from = shown.current;
    const to = shapes[next]!.outline;
    setIndex(next);
    running.current?.stop();

    const paint = (t: number) => {
      shown.current = mixOutlines(from, to, t);
      d.set(outlineToPath(shown.current));
    };

    if (reduced) {
      paint(1);
      return;
    }
    const transition = toTransition(dial.morph);
    running.current = animate(0, 1, { ...transition, onUpdate: paint });
    // every shape has quarter-turn symmetry, so the spin always lands clean
    turn.current += dial.spin;
    animate(rotate, turn.current, transition);
    animate(scale, [1, dial.squash, 1], { duration: 0.4 });
  };

  return (
    <button
      type="button"
      onClick={morph}
      aria-label="Change logo shape"
      className="block h-9 w-9 shrink-0 cursor-pointer"
    >
      <motion.svg
        viewBox={LOGO_VIEWBOX}
        fill="none"
        aria-hidden
        className="h-full w-full overflow-visible"
        style={{ rotate, scale, filter }}
      >
        <motion.path
          d={d}
          strokeWidth={20}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ stroke: shapes[index]!.color }}
          transition={{ duration: 0.3 }}
        />
      </motion.svg>
    </button>
  );
}
