import type { RasterDocument } from '../domain/image'

const HEADER_LENGTH = 12
const FORMAT_VERSION = 1
const MASK_FLAG = 0x01
const MASK_BIT = 0x80
const GRAY_MASK = 0x7f
const SIGNATURE = new Uint8Array([0x47, 0x42, 0x37, 0x1d])

export async function loadGb7Image(file: File): Promise<RasterDocument> {
  if (file.size === 0) {
    throw new Error('Выбранный файл GB7 пуст.')
  }

  let bytes: Uint8Array

  try {
    bytes = new Uint8Array(await file.arrayBuffer())
  } catch {
    throw new Error('Не удалось прочитать файл GB7.')
  }

  return decodeGb7(bytes, file.name)
}

export function decodeGb7(
  bytes: Uint8Array,
  fileName = 'image.gb7',
): RasterDocument {
  validateHeader(bytes)

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const flags = bytes[5]
  const width = view.getUint16(6, false)
  const height = view.getUint16(8, false)
  const hasMask = (flags & MASK_FLAG) !== 0

  if (width === 0 || height === 0) {
    throw new Error('Размер изображения GB7 должен быть больше нуля.')
  }

  const pixelCount = width * height
  const expectedLength = HEADER_LENGTH + pixelCount

  if (bytes.length !== expectedLength) {
    throw new Error(
      `Неверный размер GB7: ожидалось ${expectedLength} байт, получено ${bytes.length}.`,
    )
  }

  const rgba = new Uint8ClampedArray(pixelCount * 4)

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const packedPixel = bytes[HEADER_LENGTH + pixelIndex]

    if (!hasMask && (packedPixel & MASK_BIT) !== 0) {
      throw new Error('GB7 без маски содержит установленный бит прозрачности.')
    }

    const gray7 = packedPixel & GRAY_MASK
    const gray8 = Math.round((gray7 * 255) / GRAY_MASK)
    const targetIndex = pixelIndex * 4
    const alpha = hasMask && (packedPixel & MASK_BIT) === 0 ? 0 : 255

    rgba[targetIndex] = gray8
    rgba[targetIndex + 1] = gray8
    rgba[targetIndex + 2] = gray8
    rgba[targetIndex + 3] = alpha
  }

  const sourceChannels = hasMask ? 2 : 1

  return {
    pixels: new ImageData(rgba, width, height),
    fileName,
    format: 'gb7',
    width,
    height,
    sourceChannels,
    bitsPerChannel: 7,
    colorDepth: hasMask
      ? '8 бит (Grayscale 7 + Mask 1)'
      : '7 бит (Grayscale)',
  }
}

export function encodeGb7(pixels: ImageData): Uint8Array {
  const { width, height, data } = pixels

  if (width < 1 || height < 1 || width > 0xffff || height > 0xffff) {
    throw new Error('GB7 поддерживает размеры от 1 до 65535 пикселей.')
  }

  let hasMask = false

  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 128) {
      hasMask = true
      break
    }
  }

  const pixelCount = width * height
  const result = new Uint8Array(HEADER_LENGTH + pixelCount)
  const view = new DataView(result.buffer)

  result.set(SIGNATURE, 0)
  result[4] = FORMAT_VERSION
  result[5] = hasMask ? MASK_FLAG : 0
  view.setUint16(6, width, false)
  view.setUint16(8, height, false)
  view.setUint16(10, 0, false)

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const sourceIndex = pixelIndex * 4
    const gray8 = Math.round(
      0.299 * data[sourceIndex] +
        0.587 * data[sourceIndex + 1] +
        0.114 * data[sourceIndex + 2],
    )
    const gray7 = Math.round((gray8 * GRAY_MASK) / 255)
    const opaqueBit =
      hasMask && data[sourceIndex + 3] >= 128 ? MASK_BIT : 0

    result[HEADER_LENGTH + pixelIndex] = gray7 | opaqueBit
  }

  return result
}

function validateHeader(bytes: Uint8Array): void {
  if (bytes.length < HEADER_LENGTH) {
    throw new Error('Файл GB7 короче обязательного заголовка.')
  }

  if (!SIGNATURE.every((byte, index) => bytes[index] === byte)) {
    throw new Error('Неверная сигнатура файла GB7.')
  }

  if (bytes[4] !== FORMAT_VERSION) {
    throw new Error(`Версия GB7 ${bytes[4]} не поддерживается.`)
  }

  const flags = bytes[5]

  if ((flags & ~MASK_FLAG) !== 0) {
    throw new Error('В заголовке GB7 установлены неизвестные флаги.')
  }

  if (bytes[10] !== 0 || bytes[11] !== 0) {
    throw new Error('Резервное поле заголовка GB7 должно быть нулевым.')
  }
}
