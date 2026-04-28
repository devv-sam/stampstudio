import { useStampEditor } from './useStampEditor'

/**
 * Thin wrapper so export UI can stay decoupled from the full editor context later.
 */
export function useExport() {
  const { exportPng, exportJpeg, exportSvg } = useStampEditor()
  return { exportPng, exportJpeg, exportSvg }
}
