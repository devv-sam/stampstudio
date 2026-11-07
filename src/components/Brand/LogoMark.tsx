import { LOGO_D, LOGO_VIEWBOX } from "../../utils/logoShapes";

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} fill="none" aria-hidden className={className}>
      <path
        d={LOGO_D}
        stroke="currentColor"
        strokeWidth={20}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
