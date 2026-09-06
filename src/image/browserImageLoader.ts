import type {
  RasterDocument,
  SourceChannelCount,
  SupportedImageFormat,
} from '../domain/image'

type EncodedImageInfo = {
  channels: SourceChannelCount
  bitsPerChannel: number
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
])

export async function loadBrowserImage(file: File): Promise<RasterDocument> {
  const format = detectBrowserFormat(file)

  if (!format) {
    throw new Error('Выберите изображение в формате PNG, JPG или JPEG.')
  }

  if (file.size === 0) {
    throw new Error('Выбранный файл пуст.')
  }

  const [encodedInfo, image] = await Promise.all([
    readEncodedInfo(file, format),
    decodeImageElement(file),
  ])

  if (image.naturalWidth === 0 || image.naturalHeight === 0) {
    throw new Error('Изображение имеет недопустимый размер.')
  }

  const surface = document.createElement('canvas')
  surface.width = image.naturalWidth
  surface.height = image.naturalHeight

  const context = surface.getContext('2d', { willReadFrequently: true })

  if (!context) {
    throw new Error('Браузер не смог создать холст для изображения.')
  }

  try {
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, surface.width, surface.height)
    const sourceChannels = resolveChannelCount(encodedInfo.channels, pixels)

    return {
      pixels,
      fileName: file.name,
      fileSizeBytes: file.size,
      format,
      width: pixels.width,
      height: pixels.height,
      sourceChannels,
      bitsPerChannel: encodedInfo.bitsPerChannel,
      colorDepth: describeColorDepth(
        sourceChannels,
        encodedInfo.bitsPerChannel,
      ),
    }
  } catch {
    throw new Error('Не удалось получить пиксели изображения.')
  }
}

export function detectBrowserFormat(
  file: Pick<File, 'name' | 'type'>,
): Extract<SupportedImageFormat, 'png' | 'jpeg'> | null {
  const lowerName = file.name.toLowerCase()

  if (file.type === 'image/png' || lowerName.endsWith('.png')) {
    return 'png'
  }

  if (
    file.type === 'image/jpeg' ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg')
  ) {
    return 'jpeg'
  }

  return null
}

async function decodeImageElement(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file)

  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Файл повреждён или не является изображением.'))
    }

    image.src = objectUrl
  })
}

async function readEncodedInfo(
  file: File,
  format: Extract<SupportedImageFormat, 'png' | 'jpeg'>,
): Promise<EncodedImageInfo> {
  const maxHeaderSize = format === 'png' ? 33 : 512 * 1024
  const header = new Uint8Array(
    await file.slice(0, Math.min(file.size, maxHeaderSize)).arrayBuffer(),
  )

  return format === 'png' ? inspectPngHeader(header) : inspectJpegHeader(header)
}

function inspectPngHeader(bytes: Uint8Array): EncodedImageInfo {
  if (
    bytes.length < 26 ||
    !PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)
  ) {
    throw new Error('Файл не содержит корректную сигнатуру PNG.')
  }

  const chunkName = String.fromCharCode(...bytes.subarray(12, 16))

  if (chunkName !== 'IHDR') {
    throw new Error('В PNG отсутствует обязательный заголовок IHDR.')
  }

  const bitsPerChannel = bytes[24]
  const colorType = bytes[25]
  const channelsByColorType: Partial<Record<number, SourceChannelCount>> = {
    0: 1,
    2: 3,
    3: 3,
    4: 2,
    6: 4,
  }
  const channels = channelsByColorType[colorType]

  if (!channels || bitsPerChannel === 0) {
    throw new Error('PNG использует неподдерживаемую цветовую модель.')
  }

  return {
    channels,
    bitsPerChannel: colorType === 3 ? 8 : bitsPerChannel,
  }
}

function inspectJpegHeader(bytes: Uint8Array): EncodedImageInfo {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('Файл не содержит корректную сигнатуру JPEG.')
  }

  let cursor = 2

  while (cursor + 3 < bytes.length) {
    while (cursor < bytes.length && bytes[cursor] !== 0xff) {
      cursor += 1
    }

    while (cursor < bytes.length && bytes[cursor] === 0xff) {
      cursor += 1
    }

    if (cursor >= bytes.length) {
      break
    }

    const marker = bytes[cursor]
    cursor += 1

    if (marker === 0xd9 || marker === 0xda) {
      break
    }

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue
    }

    if (cursor + 1 >= bytes.length) {
      break
    }

    const segmentLength = (bytes[cursor] << 8) | bytes[cursor + 1]

    if (segmentLength < 2 || cursor + segmentLength > bytes.length) {
      break
    }

    if (JPEG_SOF_MARKERS.has(marker) && segmentLength >= 8) {
      const precision = bytes[cursor + 2]
      const componentCount = bytes[cursor + 7]

      return {
        channels: componentCount === 1 ? 1 : 3,
        bitsPerChannel: precision || 8,
      }
    }

    cursor += segmentLength
  }

  return { channels: 3, bitsPerChannel: 8 }
}

function resolveChannelCount(
  encodedChannels: SourceChannelCount,
  pixels: ImageData,
): SourceChannelCount {
  if (encodedChannels === 2 || encodedChannels === 4) {
    return encodedChannels
  }

  for (let index = 3; index < pixels.data.length; index += 4) {
    if (pixels.data[index] !== 255) {
      return encodedChannels === 1 ? 2 : 4
    }
  }

  return encodedChannels
}

function describeColorDepth(
  channels: SourceChannelCount,
  bitsPerChannel: number,
): string {
  const modelNames: Record<SourceChannelCount, string> = {
    1: 'Grayscale',
    2: 'Grayscale + Alpha',
    3: 'RGB',
    4: 'RGB + Alpha',
  }

  return `${bitsPerChannel * channels} бит (${modelNames[channels]})`
}
