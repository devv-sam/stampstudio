import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Force WebGL contexts to retain their drawing buffer so that canvas.toDataURL()
// returns real pixel data at any time (not just within the render frame).
// Must run before any shader component mounts and creates a WebGL context.
;(() => {
  const orig = HTMLCanvasElement.prototype.getContext
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(HTMLCanvasElement.prototype as any).getContext = function (
    type: string,
    attrs?: Record<string, unknown>,
  ) {
    if (type === 'webgl' || type === 'webgl2') {
      return orig.call(this, type, { ...attrs, preserveDrawingBuffer: true })
    }
    return orig.call(this, type, attrs)
  }
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
