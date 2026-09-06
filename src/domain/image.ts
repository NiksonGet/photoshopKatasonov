export type SupportedImageFormat = 'png' | 'jpeg' | 'gb7'
export type ExportImageFormat = SupportedImageFormat
export type SourceChannelCount = 1 | 2 | 3 | 4
export type ImageChannel = 'gray' | 'red' | 'green' | 'blue' | 'alpha'
export type ChannelVisibility = Record<ImageChannel, boolean>
export type EditorTool = 'pointer' | 'eyedropper'

export type LabColor = {
  lightness: number
  a: number
  b: number
}

export type PixelSample = {
  x: number
  y: number
  red: number
  green: number
  blue: number
  alpha: number
  lab: LabColor
}

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
