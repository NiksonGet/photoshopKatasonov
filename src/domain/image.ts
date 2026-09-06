export type SupportedImageFormat = 'png' | 'jpeg' | 'gb7'
export type ExportImageFormat = SupportedImageFormat
export type SourceChannelCount = 1 | 2 | 3 | 4

export type RasterDocument = {
  pixels: ImageData
  fileName: string
  fileSizeBytes: number
  format: SupportedImageFormat
  width: number
  height: number
  sourceChannels: SourceChannelCount
  bitsPerChannel: number
  colorDepth: string
}
