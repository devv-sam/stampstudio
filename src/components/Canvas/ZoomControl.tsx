import { useStampEditor } from '../../hooks/useStampEditor'

export function ZoomControl() {
  const { canvasZoom, setCanvasZoom } = useStampEditor()
  const zoomPct = Math.round(canvasZoom * 100)

  return (
    <div className="flex items-center gap-2 select-none">
      <input
        type="range"
        min={25}
        max={400}
        step={5}
        value={zoomPct}
        onChange={(e) => setCanvasZoom(Number(e.target.value) / 100)}
        className="w-[88px] cursor-pointer accent-zinc-400 opacity-60 hover:opacity-100 transition-opacity duration-150"
        aria-label="Canvas zoom level"
      />
      <span
        className="font-mono text-[10px] font-medium tabular-nums tracking-tight text-zinc-500 w-[2.25rem] cursor-default"
        title="Double-click to reset to 100%"
        onDoubleClick={() => setCanvasZoom(1)}
      >
        {zoomPct}%
      </span>
    </div>
  )
}
