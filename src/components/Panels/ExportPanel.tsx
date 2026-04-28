import { useState } from 'react'

import { useExport } from '../../hooks/useExport'
import { Button } from '../UI/Button'
import { Panel } from '../UI/Panel'
import { Slider } from '../UI/Slider'

export function ExportPanel() {
  const { exportPng, exportJpeg, exportSvg } = useExport()
  const [multiplier, setMultiplier] = useState(2)
  const [jpegQuality, setJpegQuality] = useState(0.92)

  return (
    <Panel title="Export">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Slider
            label="PNG / JPEG scale"
            min={1}
            max={4}
            step={1}
            value={multiplier}
            valueLabel={`${multiplier}x`}
            onChange={(e) => setMultiplier(Number(e.target.value))}
          />
          <Slider
            label="JPEG quality"
            min={0.5}
            max={1}
            step={0.02}
            value={jpegQuality}
            valueLabel={`${Math.round(jpegQuality * 100)}%`}
            onChange={(e) => setJpegQuality(Number(e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="primary" onClick={() => exportPng(multiplier)}>
            Download PNG
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              exportJpeg({ multiplier, quality: jpegQuality })
            }
          >
            Download JPEG
          </Button>
          <Button variant="secondary" onClick={() => exportSvg()}>
            Download SVG
          </Button>
        </div>

        <p className="text-xs leading-relaxed text-zinc-500">
          Raster exports crop to the stamp bounds. SVG uses a matching viewBox
          around the same region.
        </p>
      </div>
    </Panel>
  )
}
