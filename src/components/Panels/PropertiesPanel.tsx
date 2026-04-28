import { useStampEditor } from '../../hooks/useStampEditor'
import { Panel } from '../UI/Panel'

export function PropertiesPanel() {
  const { stampDimensions } = useStampEditor()

  return (
    <Panel title="Stamp">
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-zinc-500">Width</dt>
        <dd className="font-mono text-zinc-200">
          {stampDimensions.width}px
        </dd>
        <dt className="text-zinc-500">Height</dt>
        <dd className="font-mono text-zinc-200">
          {stampDimensions.height}px
        </dd>
      </dl>
      <p className="mt-3 text-xs text-zinc-500">
        Rounded rectangle is the export region. Corner arcs are resize handles.
      </p>
    </Panel>
  )
}
