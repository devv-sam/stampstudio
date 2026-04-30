import { useState } from 'react'
import { useExport } from '../../hooks/useExport'
import { Button } from '../UI/Button'
import { Select } from '../UI/Select'
import { Panel } from '../UI/Panel'

type ExportFormat = 'png' | 'jpeg' | 'svg'

export function ExportPanel() {
  const { exportPng, exportJpeg, exportSvg } = useExport()
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('png')

  const handleDownload = async () => {
    switch (selectedFormat) {
      case 'png':
        await exportPng()
        break
      case 'jpeg':
        await exportJpeg()
        break
      case 'svg':
        await exportSvg()
        break
    }
  }

  return (
    <Panel title="Export" className="bg-transparent border-transparent">
      <div className="flex gap-2">
        <Select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
          className="bg-transparent border-transparent"
        >
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
          <option value="svg">SVG</option>
        </Select>
        <Button variant="primary" onClick={handleDownload} className="flex-1">
          Download
        </Button>
      </div>
    </Panel>
  )
}
