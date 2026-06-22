import type { ReactNode } from 'react'

import { buildPerforationClipPathD } from '../../utils/stampPerforationLayout'

const CLIP_ID = 'changelog-stamp-clip'

export function ChangelogStampShell({
  width,
  height,
  density = 12,
  children,
  className = '',
  matClassName = 'bg-[#101010]',
}: {
  width: number
  height: number
  density?: number
  children: ReactNode
  className?: string
  /** Background visible through perforation cutouts — should match the surface behind the stamp. */
  matClassName?: string
}) {
  const d = buildPerforationClipPathD(width, height, density)

  return (
    <div
      className={`relative shadow-2xl shadow-black/70 ${matClassName} ${className}`}
      style={{ width, height }}
    >
      <svg width="0" height="0" aria-hidden className="pointer-events-none absolute">
        <defs>
          <clipPath id={CLIP_ID} clipPathUnits="userSpaceOnUse">
            <path d={d} fillRule="evenodd" />
          </clipPath>
        </defs>
      </svg>
      <div
        className="flex h-full w-full flex-col overflow-hidden bg-[#fbfaf5]"
        style={d ? { clipPath: `url(#${CLIP_ID})` } : undefined}
      >
        {children}
      </div>
    </div>
  )
}
