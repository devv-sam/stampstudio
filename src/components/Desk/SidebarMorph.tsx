import { useDialKit } from "dialkit";
import { AnimatePresence, motion } from "framer-motion";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { toTransition } from "../../utils/deskMotion";

/**
 * The inspector card. Crossfades between its main view and an alternate one
 * (the selected text's controls) while the card springs to the new height.
 */
export function SidebarMorph({
  showAlt,
  alt,
  children,
  mainClassName = "",
}: {
  showAlt: boolean;
  alt: ReactNode;
  children: ReactNode;
  mainClassName?: string;
}) {
  const morph = useDialKit(
    "Sidebar morph",
    {
      height: { type: "spring", visualDuration: 0.3, bounce: 0.1 },
      fadeDuration: [0.2, 0.02, 0.6, 0.01],
      blur: [6, 0, 24, 1],
      slide: [0, -24, 24, 1],
      scale: [0.98, 0.85, 1, 0.01],
    },
    { id: "sidebar-morph-v2", persist: true },
  );

  const hidden = {
    opacity: 0,
    y: morph.slide,
    scale: morph.scale,
    filter: `blur(${morph.blur}px)`,
  };
  const fade = {
    initial: hidden,
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    exit: hidden,
    transition: { duration: morph.fadeDuration },
  };

  const mainRef = useRef<HTMLDivElement>(null);
  const altRef = useRef<HTMLDivElement>(null);
  // spring only marks a view swap. growth inside a view (a new line of text) snaps
  const [measure, setMeasure] = useState({
    height: 0,
    first: true,
    spring: false,
  });
  const [morphing, setMorphing] = useState(false);

  // both views overlap while crossfading, so the card follows only the incoming one
  useLayoutEffect(() => {
    const el = (showAlt ? altRef : mainRef).current;
    if (!el) return;
    setMeasure((m) => ({
      height: el.offsetHeight,
      first: m.first && m.height === 0,
      spring: true,
    }));
    const observer = new ResizeObserver(() =>
      setMeasure((m) =>
        m.height === el.offsetHeight
          ? m
          : { height: el.offsetHeight, first: false, spring: false },
      ),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [showAlt]);

  return (
    <motion.div
      className={`desk-card box-content w-[212px] p-1.5 max-md:w-auto ${
        morphing ? "overflow-hidden" : ""
      }`}
      initial={false}
      animate={{ height: measure.height }}
      transition={
        measure.first || !measure.spring
          ? { duration: 0 }
          : toTransition(morph.height)
      }
      onAnimationStart={() => setMorphing(true)}
      onAnimationComplete={() => setMorphing(false)}
    >
      <div className="relative h-full">
        <AnimatePresence initial={false}>
          {showAlt ? (
            <motion.div
              key="alt"
              ref={altRef}
              {...fade}
              className="absolute inset-x-0 top-0"
            >
              {alt}
            </motion.div>
          ) : (
            <motion.div
              key="main"
              ref={mainRef}
              {...fade}
              className={`absolute inset-x-0 top-0 ${mainClassName}`}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
