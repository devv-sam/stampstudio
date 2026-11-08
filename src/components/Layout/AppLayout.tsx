import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { StampCanvas } from "../Canvas/StampCanvas";
import { CanvasFloatBar } from "../Canvas/CanvasFloatBar";
import { StampInspector } from "../Desk/StampInspector";
import { ShaderRail } from "../Desk/ShaderRail";
import { DiscInspector } from "../Disc/DiscInspector";
import { DiscStage } from "../Disc/DiscStage";
import { ModeToggle } from "./ModeToggle";
import { getLatestVersion } from "../../data/changelog";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useDiscEditor } from "../../hooks/useDiscEditor";
import { HOME_TITLE } from "../../seo";
import {
  hasUnseenChangelog,
  markChangelogSeen,
} from "../../utils/changelogStorage";
import { UpdatesModal } from "../Updates/UpdatesModal";

export function AppLayout({ header }: { header?: ReactNode }) {
  useDocumentTitle(HOME_TITLE);
  const { discMode, previewing } = useDiscEditor();
  const chrome = !(discMode && previewing);
  const location = useLocation();
  const navigate = useNavigate();
  const latest = getLatestVersion();
  const [updatesOpen, setUpdatesOpen] = useState(
    Boolean((location.state as { updates?: boolean } | null)?.updates),
  );

  // clear the /changelog redirect flag so a reload doesn't reopen the popup
  useEffect(() => {
    if (location.state)
      navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (updatesOpen && latest) markChangelogSeen(latest);
  }, [updatesOpen, latest]);

  return (
    <>
      <div className="relative h-full min-h-0 overflow-hidden bg-desk text-ink">
        {chrome ? (
          <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-5 py-4">
            <h1 className="sr-only">
              stampstudio — online postage stamp maker and designer
            </h1>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-md:top-[calc(100%+0.25rem)] max-md:translate-y-0">
              <ModeToggle />
            </div>
            {/* ml-auto, the heading beside it is sr-only so it takes no space */}
            <div className="ml-auto flex items-center gap-4">
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
        ) : null}

        {/* the stamp canvas stays mounted in disc mode so its work survives the switch.
            opacity + inert, since canvas children force their own visibility and pointer events */}
        <main
          className={`desk-stage flex min-h-0 min-w-0 flex-col ${discMode ? "opacity-0" : ""}`}
          inert={discMode}
        >
          <p className="sr-only">
            Free online stamp maker to create custom postage stamps. Upload
            photos, add typography, adjust perforated edges, apply print-style
            shaders, and export PNG, JPEG, or SVG — no account required.
          </p>
          <StampCanvas />
        </main>

        {discMode ? <DiscStage /> : null}

        {chrome ? (
          <>
            <div className="pointer-events-none z-20 max-md:absolute max-md:inset-x-3 max-md:bottom-[5.5rem] max-md:flex max-md:flex-col-reverse max-md:gap-2">
              <div className="min-w-0 md:absolute md:left-5 md:top-1/2 md:-translate-y-1/2">
                <ShaderRail />
              </div>
              <div className="md:absolute md:right-6 md:top-1/2 md:-translate-y-1/2">
                {discMode ? <DiscInspector /> : <StampInspector />}
              </div>
            </div>

            <CanvasFloatBar />
          </>
        ) : null}
      </div>

      <UpdatesModal open={updatesOpen} onClose={() => setUpdatesOpen(false)} />
    </>
  );
}
