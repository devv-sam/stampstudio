import { useStampEditor } from '../../hooks/useStampEditor'

/** Bottom-right readout for live stamp pixel size (canvas area). */
export function StampSizeHud() {
  const { stampDimensions } = useStampEditor()

  return (
    <p
      className="text-right font-mono text-[10px] font-medium tabular-nums tracking-tight text-zinc-500"
      aria-live="polite"
      aria-label="Stamp dimensions in pixels"
    >
      {stampDimensions.width} × {stampDimensions.height}
    </p>
  )
}
