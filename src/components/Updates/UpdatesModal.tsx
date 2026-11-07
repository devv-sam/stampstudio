import { useState } from "react";
import { X } from "lucide-react";

import { getChangelog } from "../../data/changelog";
import {
  formatVersionLabel,
  sectionKind,
  type ChangelogRelease,
} from "../../utils/parseChangelog";
import { Modal } from "../UI/Modal";

const KIND_LABEL = { new: "New", improve: "Improved", fix: "Fix" } as const;

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ItemText({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    return bold ? (
      <strong key={i} className="font-medium text-ink">
        {bold[1]}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

function Release({ release }: { release: ChangelogRelease }) {
  const items = release.sections.flatMap((section) => {
    const kind = sectionKind(section.heading);
    return section.items.map((text) => ({
      text,
      label: kind === "other" ? null : KIND_LABEL[kind],
    }));
  });

  return (
    <>
      <h3 className="text-xl font-semibold tracking-tight">
        {release.title ?? `Version ${formatVersionLabel(release.version)}`}
      </h3>
      <ul className="mt-5 space-y-3">
        {items.map(({ text, label }) => (
          <li key={text} className="flex items-start justify-between gap-6">
            <p className="min-w-0 text-sm leading-relaxed text-ink-soft">
              <ItemText text={text} />
            </p>
            {label ? (
              <span className="shrink-0 rounded-lg bg-zinc-800 px-2 py-0.5 text-sm">
                {label}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}

export function UpdatesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const releases = getChangelog();
  const [version, setVersion] = useState(releases[0]?.version);
  const selected = releases.find((r) => r.version === version);

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="updates-title"
      panelClassName="h-[min(560px,85vh)] !w-[min(760px,92vw)]"
    >
      <div className="relative grid h-full min-h-0 grid-cols-[11rem_minmax(0,1fr)] max-md:grid-cols-1 max-md:grid-rows-[auto_minmax(0,1fr)]">
        <nav aria-label="Releases" className="min-h-0 overflow-y-auto p-1.5">
          <h2 id="updates-title" className="px-2.5 py-2 text-lg font-semibold">
            Updates
          </h2>
          <ul className="space-y-0.5 max-md:flex max-md:gap-1 max-md:space-y-0 max-md:overflow-x-auto">
            {releases.map((release) => {
              const active = release.version === version;
              return (
                <li key={release.version} className="max-md:shrink-0">
                  <button
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => setVersion(release.version)}
                    className={`w-full cursor-pointer rounded-xl px-2.5 py-1.5 text-left text-sm transition-colors ${
                      active ? "bg-zinc-800" : "hover:bg-zinc-900"
                    }`}
                  >
                    <span className="block">
                      {formatVersionLabel(release.version)}
                    </span>
                    <time
                      dateTime={release.date}
                      className="block text-xs text-ink-soft"
                    >
                      {formatDate(release.date)}
                    </time>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-h-0 overflow-y-auto p-6 pr-12">
          {selected ? (
            <Release release={selected} />
          ) : (
            <p className="text-sm text-ink-soft">No releases yet.</p>
          )}
        </div>

        <button
          type="button"
          aria-label="Close updates"
          onClick={onClose}
          className="absolute top-3 right-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-zinc-900 hover:text-ink"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    </Modal>
  );
}
