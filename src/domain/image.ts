export type SupportedImageFormat = 'png' | 'jpeg' | 'gb7'

export type RasterDocument = {
  pixels: ImageData
  fileName: string
  format: SupportedImageFormat
  width: number
  height: number
  colorDepth: string
}

