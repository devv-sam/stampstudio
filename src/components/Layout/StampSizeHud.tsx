import { useStampEditor } from '../../hooks/useStampEditor'
import { RollingNumber } from '../UI/RollingNumber'

/** Live stamp pixel size readout. */
export function StampSizeHud() {
  const { stampDimensions } = useStampEditor()

  return (
    <p
      className="text-sm tabular-nums text-ink-soft"
      aria-label="Stamp dimensions in pixels"
    >
      <RollingNumber value={stampDimensions.width} /> ×{' '}
      <RollingNumber value={stampDimensions.height} />
    </p>
  )
}
