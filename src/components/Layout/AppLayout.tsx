import type { ReactNode } from "react";

import { StampCanvas } from "../Canvas/StampCanvas";
import { TextFloatBar } from "../Canvas/TextFloatBar";
import { PropertiesPanel } from "../Panels/PropertiesPanel";
import { Toolbar } from "./Toolbar";
import { HeaderExport } from "./HeaderExport";

export function AppLayout({ header }: { header?: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-5 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-base font-normal tracking-tight text-white lowercase">
            stampstudio
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <HeaderExport />
          {header}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#141416]">
          <StampCanvas />
          <TextFloatBar />
          <div className="pointer-events-none absolute bottom-4 left-4 z-10">
            <Toolbar />
          </div>
        </main>

        <aside className="flex w-[320px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-zinc-800/80 bg-[#101010] p-5">
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  );
}
