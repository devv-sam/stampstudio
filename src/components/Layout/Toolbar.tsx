import { motion } from "framer-motion";

import { useStampEditor } from "../../hooks/useStampEditor";
import { Button } from "../UI/Button";

export function Toolbar() {
  const { snapToPresetsEnabled, setSnapToPresetsEnabled } = useStampEditor();

  return (
    <div className="pointer-events-auto flex flex-col gap-3 rounded-md border border-zinc-800/80 bg-zinc-900/90 p-3 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium leading-tight text-zinc-300">
            Snap to presets
          </span>
          <span className="mt-0.5 block text-[10px] leading-snug text-zinc-500">
            Pulls to common sizes while you resize
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={snapToPresetsEnabled}
          aria-label="Toggle snap to recommended sizes"
          onClick={() => setSnapToPresetsEnabled(!snapToPresetsEnabled)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border p-px transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400/60 ${
            snapToPresetsEnabled
              ? "border-zinc-500 bg-zinc-100"
              : "border-zinc-700 bg-zinc-950"
          }`}
        >
          <motion.span
            aria-hidden
            className={`pointer-events-none block h-3.5 w-3.5 rounded-full shadow-sm ring-1 ring-black/20 ${
              snapToPresetsEnabled ? "bg-zinc-900" : "bg-zinc-300"
            }`}
            animate={{ x: snapToPresetsEnabled ? 16 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      <div className="h-px w-full bg-zinc-800/90" />

      <Button variant="ghost" className="justify-start px-2 py-1.5 text-xs" disabled>
        Grid (soon)
      </Button>
    </div>
  );
}
