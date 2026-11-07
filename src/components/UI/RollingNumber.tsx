import { AnimatePresence, motion } from "framer-motion";

export function RollingNumber({ value }: { value: number }) {
  return (
    <span className="inline-flex overflow-hidden tabular-nums" aria-label={String(value)}>
      {String(value)
        .split("")
        .map((digit, i) => (
          <span key={i} aria-hidden className="relative inline-block">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={digit}
                className="inline-block"
                initial={{ y: "70%", opacity: 0, filter: "blur(3px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: "-70%", opacity: 0, filter: "blur(3px)" }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {digit}
              </motion.span>
            </AnimatePresence>
          </span>
        ))}
    </span>
  );
}
