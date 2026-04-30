import { useState } from 'react'
import { useExport } from '../../hooks/useExport'
import { Button } from '../UI/Button'
import { Select } from '../UI/Select'

type ExportFormat = 'png' | 'jpeg' | 'svg'

export function HeaderExport() {
  const { exportPng, exportJpeg, exportSvg } = useExport()
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('png')

  const handleDownload = () => {
    switch (selectedFormat) {
      case 'png':
        exportPng()
        break
      case 'jpeg':
        exportJpeg()
        break
      case 'svg':
        exportSvg()
        break
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <Select
        value={selectedFormat}
        onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
        className="bg-zinc-800/50 border-zinc-700/50 text-sm"
      >
        <option value="png">PNG</option>
        <option value="jpeg">JPEG</option>
        <option value="svg">SVG</option>
      </Select>
      <Button variant="primary" onClick={handleDownload} className="text-sm px-4 py-1.5">
        Download
      </Button>
    </div>
  )
}