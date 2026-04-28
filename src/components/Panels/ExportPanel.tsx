import { useExport } from '../../hooks/useExport'
import { Button } from '../UI/Button'
import { Panel } from '../UI/Panel'

export function ExportPanel() {
  const { exportPng, exportJpeg, exportSvg } = useExport()

  return (
    <Panel title="Export">
      <div className="flex flex-col gap-2">
        <Button variant="primary" onClick={() => exportPng()}>
          Download PNG
        </Button>
        <Button variant="secondary" onClick={() => exportJpeg()}>
          Download JPEG
        </Button>
        <Button variant="secondary" onClick={() => exportSvg()}>
          Download SVG
        </Button>
      </div>
    </Panel>
  )
}
