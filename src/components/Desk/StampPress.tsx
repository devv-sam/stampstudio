import { AnimatePresence, motion } from "framer-motion";

import { LogoMark } from "../Brand/LogoMark";

export type PressPhase = "idle" | "down" | "mark";

export const PRESS_DROP_SECONDS = 0.22;

export function StampPress({ phase }: { phase: PressPhase }) {
  return (
    <div
      aria-hidden
      className="desk-stage pointer-events-none z-30 flex items-center justify-center"
    >
      <AnimatePresence>
        {phase === "down" ? (
          <motion.div
            key="plate"
            initial={{ scale: 1.7, opacity: 0, y: -80, filter: "blur(16px)" }}
            animate={{ scale: 1, opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ scale: 1.4, opacity: 0, y: -60, filter: "blur(12px)" }}
            transition={{ duration: PRESS_DROP_SECONDS, ease: "easeIn" }}
            className="absolute flex h-64 w-80 items-center justify-center rounded-3xl border border-[#5bcd8a] bg-[linear-gradient(180deg,#00cc55_0%,#07602c_100%)] text-[#fff] shadow-chunky"
          >
            <LogoMark className="h-28 w-28" />
          </motion.div>
        ) : null}
        {phase === "mark" ? (
          <motion.div
            key="mark"
            initial={{ opacity: 0.95, rotate: -9 }}
            animate={{ opacity: 0.95, rotate: -9 }}
            exit={{ opacity: 0, filter: "blur(8px)" }}
            transition={{ duration: 0.5 }}
            className="absolute flex h-44 w-44 items-center justify-center text-clover"
          >
            <LogoMark className="absolute inset-0" />
            <span className="text-2xl font-bold">Posted</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
