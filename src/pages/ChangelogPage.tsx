import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

import { getChangelog, getLatestVersion } from "../data/changelog";
import { markChangelogSeen } from "../utils/changelogStorage";
import {
  formatVersionLabel,
  sectionKind,
  type ChangelogRelease,
} from "../utils/parseChangelog";
import { X } from "lucide-react";

const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function formatDateShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** True when the release date is within the last 7 days. */
function isWithinNewWindow(isoDate: string, now = Date.now()): boolean {
  const t = new Date(`${isoDate}T00:00:00`).getTime();
  if (Number.isNaN(t)) return false;
  return now - t <= NEW_WINDOW_MS && now - t >= -24 * 60 * 60 * 1000;
}

/** Render Keep a Changelog list items; bold **name** spans become strong. */
function ChangelogItemText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) {
          return (
            <strong key={i} className="font-medium text-white">
              {bold[1]}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

const KIND_LABEL: Record<
  "new" | "improve" | "fix" | "other",
  { label: string; className: string }
> = {
  new: {
    label: "New",
    className: "text-teal-400",
  },
  improve: {
    label: "Improve",
    className: "text-blue-400",
  },
  fix: {
    label: "Fix",
    className: "text-amber-400",
  },
  other: {
    label: "Note",
    className: "text-zinc-500",
  },
};

function KindLabel({ kind }: { kind: keyof typeof KIND_LABEL }) {
  const badge = KIND_LABEL[kind];
  return (
    <span
      className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

/**
 * Kind labels only appear on releases within the 7-day window.
 * Older releases (e.g. launch) show plain text with no badges.
 */
function displayKind(
  kind: ReturnType<typeof sectionKind>,
  releaseIsRecent: boolean,
): keyof typeof KIND_LABEL | null {
  if (!releaseIsRecent) return null;
  if (kind === "other") return null;
  return kind;
}

function ReleaseEntry({ release }: { release: ChangelogRelease }) {
  const releaseIsRecent = isWithinNewWindow(release.date);
  const items = release.sections.flatMap((section) =>
    section.items.map((item) => ({
      kind: displayKind(sectionKind(section.heading), releaseIsRecent),
      text: item,
    })),
  );
  const showKinds = items.some((item) => item.kind !== null);

  return (
    <li className="grid grid-cols-1 gap-3 md:grid-cols-[9.5rem_minmax(0,1fr)_9.5rem] md:items-start md:gap-x-0">
      {/* Far-left meta: version + date */}
      <aside className="flex flex-row flex-wrap items-center gap-2 pt-1 md:flex-col md:items-start md:gap-1">
        <span className="inline-flex items-center rounded-full border border-zinc-600/80 px-2 py-0.5 font-mono text-[11px] font-medium text-zinc-300">
          {formatVersionLabel(release.version)}
        </span>
        <time
          dateTime={release.date}
          className="text-[11px] tabular-nums text-zinc-500"
        >
          {formatDateShort(release.date)}
        </time>
      </aside>

      {/* Centered content */}
      <div className="mx-auto w-full min-w-0 max-w-xl">
        <h2 className="font-display text-md leading-snug tracking-tight text-white">
          {release.title ?? `v${formatVersionLabel(release.version)}`}
        </h2>

        <ul className="mt-5 space-y-3.5">
          {items.map((item) => (
            <li
              key={item.text}
              className={showKinds ? "flex gap-2.5" : undefined}
            >
              {showKinds ? (
                <div className="shrink-0 pt-0.5">
                  {item.kind ? <KindLabel kind={item.kind} /> : null}
                </div>
              ) : null}
              <p className="min-w-0 text-sm leading-relaxed text-zinc-400">
                <ChangelogItemText text={item.text} />
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Mirror spacer so the content column stays centered */}
      <div className="hidden md:block" aria-hidden />
    </li>
  );
}

export function ChangelogPage() {
  const releases = getChangelog();
  const latestVersion = getLatestVersion();

  useEffect(() => {
    if (latestVersion) markChangelogSeen(latestVersion);
  }, [latestVersion]);

  return (
    <>
      <Analytics />
      <div className="flex h-full min-h-0 flex-col bg-[#0a0a0a] text-zinc-100">
        <header className="flex shrink-0 items-center justify-between px-6 py-4 md:px-16 lg:px-24 xl:px-32"></header>

        <main className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="w-full px-6 pb-16 pt-2 md:pt-24 md:px-16 lg:px-24">
            <div className="flex justify-between">
              <div className="max-w-sm ">
                <h1 className="font-display text-xl leading-tight tracking-tight text-white">
                  Updates
                </h1>
                <p className="mt-1.5 text-base text-zinc-500">
                  Features, fixes, and polish — newest first.
                </p>
              </div>
              <Link
                to="/"
                className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
              >
                <X size={16} />
              </Link>
            </div>

            {releases.length === 0 ? (
              <p className="mt-12 text-sm text-zinc-500">No releases yet.</p>
            ) : (
              <ol className="mt-12 flex flex-col gap-14 md:mt-16 md:gap-16">
                {releases.map((release) => (
                  <ReleaseEntry key={release.version} release={release} />
                ))}
              </ol>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
