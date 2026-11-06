import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";

import { StampCanvas } from "../Canvas/StampCanvas";
import { CanvasFloatBar } from "../Canvas/CanvasFloatBar";
import { ActiveTextTypography } from "../Panels/ActiveTextTypography";
import { LogoMorph } from "../Brand/LogoMorph";
import { StampInspector } from "../Desk/StampInspector";
import { ShaderRail } from "../Desk/ShaderRail";
import { StampSheetExperiment } from "../Experiments/StampSheetExperiment";
import { getLatestVersion } from "../../data/changelog";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useExperiments } from "../../hooks/useExperiments";
import { HOME_TITLE } from "../../seo";
import { hasUnseenChangelog } from "../../utils/changelogStorage";

function ChangelogLink() {
  const latest = getLatestVersion();
  const unread = hasUnseenChangelog(latest);

  return (
    <Link
      to="/changelog"
      className="relative inline-flex cursor-pointer items-center gap-1.5 text-sm hover:text-ink-soft"
    >
      Updates
      {unread ? (
        <span
          className="h-2 w-2 rounded-full bg-peony"
          aria-label="Unread updates"
        />
      ) : null}
    </Link>
  );
}

export function AppLayout({ header }: { header?: ReactNode }) {
  useDocumentTitle(HOME_TITLE);
  const { active } = useExperiments();

  return (
    <>
      <Analytics />
      <div className="relative h-full min-h-0 overflow-hidden bg-desk text-ink">
        <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <LogoMorph />
              <h1 className="sr-only">
                stampstudio — online postage stamp maker and designer
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ChangelogLink />
            {header}
            <a
              href="https://devvsam.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              by @devvsam
            </a>
          </div>
        </header>

        <main className="desk-stage flex min-h-0 min-w-0 flex-col">
          <p className="sr-only">
            Free online stamp maker to create custom postage stamps. Upload
            photos, add typography, adjust perforated edges, apply print-style
            shaders, and export PNG, JPEG, or SVG — no account required.
          </p>
          <StampCanvas />
        </main>

        <div className="pointer-events-none z-20 max-md:absolute max-md:inset-x-3 max-md:bottom-[5.5rem] max-md:flex max-md:items-end max-md:gap-2">
          <div className="min-w-0 max-md:flex-1 md:absolute md:left-5 md:top-1/2 md:-translate-y-1/2">
            <ShaderRail />
          </div>
          <div className="md:absolute md:right-6 md:top-1/2 md:-translate-y-1/2">
            <StampInspector />
          </div>
        </div>

        <ActiveTextTypography />
        <CanvasFloatBar />

      </div>

      <AnimatePresence>
        {active === "stampsheet" ? <StampSheetExperiment /> : null}
      </AnimatePresence>
    </>
  );
}
