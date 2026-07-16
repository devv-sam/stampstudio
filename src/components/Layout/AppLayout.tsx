import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

import { StampCanvas } from "../Canvas/StampCanvas";
import { CanvasFloatBar } from "../Canvas/CanvasFloatBar";
import { PropertiesPanel } from "../Panels/PropertiesPanel";
import { StampSizeHud } from "./StampSizeHud";
import { ZoomControl } from "../Canvas/ZoomControl";
import { OutlineModeToggle } from "../Canvas/OutlineModeToggle";
import { getLatestVersion } from "../../data/changelog";
import { hasUnseenChangelog } from "../../utils/changelogStorage";

function ChangelogLink() {
  const latest = getLatestVersion();
  const unread = hasUnseenChangelog(latest);

  return (
    <Link
      to="/changelog"
      className="relative inline-flex cursor-pointer font-medium items-center gap-1.5 text-xs hover:text-zinc-200"
    >
      Updates
      {unread ? (
        <span
          className="h-1.5 w-1.5 rounded-full bg-white"
          aria-label="Unread updates"
        />
      ) : null}
    </Link>
  );
}

export function AppLayout({ header }: { header?: ReactNode }) {
  return (
    <>
      <Analytics />
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-5 py-3">
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-base font-normal tracking-tight text-white lowercase">
              stampstudio
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ChangelogLink />
            {header}
            <a
              href="https://devvsam.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              by @devvsam
            </a>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
          <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#141416]">
            <StampCanvas />
            <CanvasFloatBar />
            <div className="pointer-events-auto absolute bottom-4 left-4 z-10 flex flex-col items-start gap-2">
              <OutlineModeToggle />
              <ZoomControl />
            </div>
            <div className="pointer-events-none absolute bottom-4 right-4 z-10">
              <StampSizeHud />
            </div>
          </main>

          <aside className="flex h-[42vh] w-full shrink-0 flex-col gap-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-t border-zinc-800/80 bg-[#101010] p-5 md:h-auto md:w-[320px] md:border-l md:border-t-0">
            <PropertiesPanel />
          </aside>
        </div>
      </div>
    </>
  );
}
