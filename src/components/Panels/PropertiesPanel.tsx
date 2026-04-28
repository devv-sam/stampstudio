import { useRef, useState } from 'react'
import { ChromePicker } from 'react-color'

import { useStampEditor } from '../../hooks/useStampEditor'
import { PerforationSlider } from '../UI/PerforationSlider'

// 5 presets — will be swapped for album palette colors once image upload lands
const COLOR_PRESETS = ['#ffffff', '#d4d4d4', '#a3a3a3', '#404040', '#0a0a0a']

export function PropertiesPanel() {
  const { perforationCount, setPerforationCount, stampColor, setStampColor } =
    useStampEditor()

  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-zinc-300">Stamp</p>

      <PerforationSlider
        label="Perforation"
        defaultValue={perforationCount}
        minValue={0}
        maxValue={28}
        onChange={setPerforationCount}
      />

      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">Color</span>
        <div className="flex items-center gap-2">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setStampColor(color)}
              title={color}
              className="h-5 w-5 rounded-full transition-transform hover:scale-110 focus:outline-none"
              style={{
                background: color,
                outline:
                  stampColor === color
                    ? '2px solid white'
                    : '2px solid transparent',
                outlineOffset: '1px',
                boxShadow:
                  color === '#ffffff' || color === '#d4d4d4'
                    ? 'inset 0 0 0 1px rgba(0,0,0,0.15)'
                    : undefined,
              }}
            />
          ))}

          {/* Custom color picker */}
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              title="Custom color"
              className="h-5 w-5 rounded-full transition-transform hover:scale-110 focus:outline-none"
              style={{
                background:
                  'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                outline:
                  !COLOR_PRESETS.includes(stampColor) && pickerOpen
                    ? '2px solid white'
                    : '2px solid transparent',
                outlineOffset: '1px',
              }}
            />
            {pickerOpen && (
              <div
                className="absolute right-0 top-7 z-50"
                onMouseLeave={() => setPickerOpen(false)}
              >
                <ChromePicker
                  color={stampColor}
                  onChange={(c) => setStampColor(c.hex)}
                  disableAlpha
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
