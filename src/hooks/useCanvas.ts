import { useEffect, useState, type RefObject } from 'react'

/**
 * Track container size so the Fabric canvas can fill the workspace.
 */
export function useCanvasSize(containerRef: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      const width = Math.max(320, Math.floor(rect.width))
      const height = Math.max(240, Math.floor(rect.height))
      setSize({ width, height })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef])

  return size
}
