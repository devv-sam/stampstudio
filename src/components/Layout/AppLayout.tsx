import type { ReactNode } from 'react'

import { StampCanvas } from '../Canvas/StampCanvas'
import { ExportPanel } from '../Panels/ExportPanel'
import { PropertiesPanel } from '../Panels/PropertiesPanel'
import { ToolPanel } from '../Panels/ToolPanel'
import { Toolbar } from './Toolbar'

export function AppLayout({ header }: { header?: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-5 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-xl font-normal tracking-tight text-white lowercase">
            stampstudio
          </h1>
          <span className="text-xs font-normal text-zinc-500">
            Canvas editor
          </span>
        </div>
        {header}
      </header>

      <div className="relative flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1 bg-zinc-950">
          <StampCanvas />
          <div className="pointer-events-none absolute bottom-4 left-4 z-10">
            <Toolbar />
          </div>
        </main>

        <aside className="flex w-[320px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-zinc-800/80 bg-zinc-950/95 p-4">
          <ToolPanel />
          <PropertiesPanel />
          <ExportPanel />
        </aside>
      </div>
    </div>
  )
}
