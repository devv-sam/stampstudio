export type ExportFormat = 'png' | 'jpeg' | 'svg'

export type RasterExportOptions = {
  /** Scale factor for PNG/JPEG (e.g. 2 for 2x resolution) */
  multiplier?: number
  /** JPEG quality 0–1 */
  quality?: number
}
