import { Panel } from '../UI/Panel'

export function ToolPanel() {
  return (
    <Panel title="Tools">
      <p className="text-sm text-zinc-500">
        Shapes, text, and palettes will plug in here. For now, use the stamp on
        the canvas — drag corners to resize.
      </p>
    </Panel>
  )
}
