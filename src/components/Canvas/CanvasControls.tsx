import { Button } from '../UI/Button'

type Props = {
  onFit?: () => void
  onDeselect?: () => void
}

export function CanvasControls({ onFit, onDeselect }: Props) {
  return (
    <div className="pointer-events-auto flex flex-wrap gap-2">
      <Button variant="secondary" className="text-xs" type="button" onClick={onFit}>
        Fit stamp
      </Button>
      <Button variant="ghost" className="text-xs" type="button" onClick={onDeselect}>
        Deselect
      </Button>
    </div>
  )
}
