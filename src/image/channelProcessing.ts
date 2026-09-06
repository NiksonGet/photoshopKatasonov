import type {
  ChannelVisibility,
  ImageChannel,
  PixelSample,
  RasterDocument,
  SourceChannelCount,
} from '../domain/image'
import { convertRgbToLab } from './colorConversion'

export type ChannelDefinition = {
  id: ImageChannel
  label: string
  shortLabel: string
}

const CHANNELS: Record<ImageChannel, ChannelDefinition> = {
  gray: { id: 'gray', label: 'Градации серого', shortLabel: 'Gray' },
  red: { id: 'red', label: 'Красный', shortLabel: 'R' },
  green: { id: 'green', label: 'Зелёный', shortLabel: 'G' },
  blue: { id: 'blue', label: 'Синий', shortLabel: 'B' },
  alpha: { id: 'alpha', label: 'Альфа-канал', shortLabel: 'A' },
}

const CHANNEL_LAYOUTS: Record<SourceChannelCount, ImageChannel[]> = {
  1: ['gray'],
  2: ['gray', 'alpha'],
  3: ['red', 'green', 'blue'],
  4: ['red', 'green', 'blue', 'alpha'],
}

export function createChannelVisibility(): ChannelVisibility {
  return {
    gray: true,
    red: true,
    green: true,
    blue: true,
    alpha: true,
  }
}

export function getDocumentChannels(
  image: RasterDocument | null,
): ChannelDefinition[] {
  if (!image) {
    return []
  }

  return CHANNEL_LAYOUTS[image.sourceChannels].map((channel) => CHANNELS[channel])
}

export function composeChannelView(
  source: ImageData,
  visibility: ChannelVisibility,
  channels: readonly ChannelDefinition[],
): ImageData {
  const output = new Uint8ClampedArray(source.data.length)
  const channelIds = new Set(channels.map((channel) => channel.id))
  const grayscaleDocument = channelIds.has('gray')
  const hasAlpha = channelIds.has('alpha')
  const hasVisibleColor = grayscaleDocument
    ? visibility.gray
    : visibility.red || visibility.green || visibility.blue

  if (!hasVisibleColor && hasAlpha && visibility.alpha) {
    writeAlphaMask(source.data, output)
  } else if (grayscaleDocument) {
    writeGrayscaleView(source.data, output, visibility, hasAlpha)
  } else {
    writeRgbView(source.data, output, visibility, hasAlpha)
  }

  return new ImageData(output, source.width, source.height)
}

export function createChannelThumbnail(
  source: ImageData,
  channel: ImageChannel,
  maximumWidth = 68,
  maximumHeight = 46,
): ImageData {
  const scale = Math.min(
    maximumWidth / source.width,
    maximumHeight / source.height,
    1,
  )
  const width = Math.max(1, Math.round(source.width * scale))
  const height = Math.max(1, Math.round(source.height * scale))
  const thumbnail = new ImageData(width, height)

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor(y / scale))

    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor(x / scale))
      const sourceIndex = (sourceY * source.width + sourceX) * 4
      const targetIndex = (y * width + x) * 4
      const intensity = getChannelIntensity(source.data, sourceIndex, channel)

      thumbnail.data[targetIndex] = intensity
      thumbnail.data[targetIndex + 1] = intensity
      thumbnail.data[targetIndex + 2] = intensity
      thumbnail.data[targetIndex + 3] = 255
    }
  }

  return thumbnail
}

export function samplePixel(
  pixels: ImageData,
  x: number,
  y: number,
): PixelSample {
  const index = (y * pixels.width + x) * 4
  const red = pixels.data[index]
  const green = pixels.data[index + 1]
  const blue = pixels.data[index + 2]
  const alpha = pixels.data[index + 3]

  return {
    x,
    y,
    red,
    green,
    blue,
    alpha,
    lab: convertRgbToLab(red, green, blue),
  }
}

function writeAlphaMask(
  source: Uint8ClampedArray,
  output: Uint8ClampedArray,
): void {
  for (let index = 0; index < source.length; index += 4) {
    const alpha = source[index + 3]
    output[index] = alpha
    output[index + 1] = alpha
    output[index + 2] = alpha
    output[index + 3] = 255
  }
}

function writeGrayscaleView(
  source: Uint8ClampedArray,
  output: Uint8ClampedArray,
  visibility: ChannelVisibility,
  hasAlpha: boolean,
): void {
  for (let index = 0; index < source.length; index += 4) {
    const gray = visibility.gray ? source[index] : 0
    output[index] = gray
    output[index + 1] = gray
    output[index + 2] = gray
    output[index + 3] = hasAlpha && visibility.alpha ? source[index + 3] : 255
  }
}

function writeRgbView(
  source: Uint8ClampedArray,
  output: Uint8ClampedArray,
  visibility: ChannelVisibility,
  hasAlpha: boolean,
): void {
  for (let index = 0; index < source.length; index += 4) {
    output[index] = visibility.red ? source[index] : 0
    output[index + 1] = visibility.green ? source[index + 1] : 0
    output[index + 2] = visibility.blue ? source[index + 2] : 0
    output[index + 3] = hasAlpha && visibility.alpha ? source[index + 3] : 255
  }
}

function getChannelIntensity(
  pixels: Uint8ClampedArray,
  index: number,
  channel: ImageChannel,
): number {
  if (channel === 'red' || channel === 'gray') {
    return pixels[index]
  }

  if (channel === 'green') {
    return pixels[index + 1]
  }

  if (channel === 'blue') {
    return pixels[index + 2]
  }

  return pixels[index + 3]
}
