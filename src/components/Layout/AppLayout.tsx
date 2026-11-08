import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import { StampCanvas } from "../Canvas/StampCanvas";
import { CanvasFloatBar } from "../Canvas/CanvasFloatBar";
import { LogoMorph } from "../Brand/LogoMorph";
import { StampInspector } from "../Desk/StampInspector";
import { ShaderRail } from "../Desk/ShaderRail";
import { CdExperiment } from "../Experiments/CdExperiment";
import { StampSheetExperiment } from "../Experiments/StampSheetExperiment";
import { getLatestVersion } from "../../data/changelog";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useExperiments } from "../../hooks/useExperiments";
import { HOME_TITLE } from "../../seo";
import {
  hasUnseenChangelog,
  markChangelogSeen,
} from "../../utils/changelogStorage";
import { UpdatesModal } from "../Updates/UpdatesModal";

export function AppLayout({ header }: { header?: ReactNode }) {
  useDocumentTitle(HOME_TITLE);
  const { active } = useExperiments();
  const location = useLocation();
  const navigate = useNavigate();
  const latest = getLatestVersion();
  const [updatesOpen, setUpdatesOpen] = useState(
    Boolean((location.state as { updates?: boolean } | null)?.updates),
  );

  // clear the /changelog redirect flag so a reload doesn't reopen the popup
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (updatesOpen && latest) markChangelogSeen(latest);
  }, [updatesOpen, latest]);

  return (
    <>
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
            <button
              type="button"
              onClick={() => setUpdatesOpen(true)}
              className="relative inline-flex cursor-pointer items-center gap-1.5 text-sm hover:text-ink-soft"
            >
              Updates
              {hasUnseenChangelog(latest) ? (
                <span
                  className="h-2 w-2 rounded-full bg-peony"
                  aria-label="Unread updates"
                />
              ) : null}
            </button>
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

        <div className="pointer-events-none z-20 max-md:absolute max-md:inset-x-3 max-md:bottom-[5.5rem] max-md:flex max-md:flex-col-reverse max-md:gap-2">
          <div className="min-w-0 md:absolute md:left-5 md:top-1/2 md:-translate-y-1/2">
            <ShaderRail />
          </div>
          <div className="md:absolute md:right-6 md:top-1/2 md:-translate-y-1/2">
            <StampInspector />
          </div>
        </div>

        <CanvasFloatBar />

      </div>

      <UpdatesModal
        open={updatesOpen}
        onClose={() => setUpdatesOpen(false)}
      />

      <AnimatePresence>
        {active === "stampsheet" ? <StampSheetExperiment /> : null}
        {active === "cd" ? <CdExperiment /> : null}
      </AnimatePresence>
    </>
  );
}
