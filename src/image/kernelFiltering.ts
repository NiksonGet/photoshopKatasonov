import type { ImageChannel } from '../domain/image'

export type KernelPresetId =
  | 'identity'
  | 'sharpen'
  | 'gaussian'
  | 'box-blur'
  | 'prewitt-horizontal'
  | 'prewitt-vertical'

export type EdgeHandling = 'copy' | 'black' | 'white'

export type KernelPreset = {
  id: KernelPresetId
  label: string
  values: readonly number[]
}

export type KernelFilterSettings = {
  kernel: readonly number[]
  channels: readonly ImageChannel[]
  edgeHandling: EdgeHandling
}

export type KernelFilterProgress = {
  phase: 'padding' | 'convolution'
  value: number
}

type KernelFilterOptions = {
  signal?: AbortSignal
  onProgress?: (progress: KernelFilterProgress) => void
}

export const KERNEL_PRESETS: readonly KernelPreset[] = [
  {
    id: 'identity',
    label: 'Тождественное отображение',
    values: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  },
  {
    id: 'sharpen',
    label: 'Повышение резкости',
    values: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  },
  {
    id: 'gaussian',
    label: 'Фильтр Гаусса 3×3',
    values: [1 / 16, 2 / 16, 1 / 16, 2 / 16, 4 / 16, 2 / 16, 1 / 16, 2 / 16, 1 / 16],
  },
  {
    id: 'box-blur',
    label: 'Прямоугольное размытие',
    values: [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9],
  },
  {
    id: 'prewitt-horizontal',
    label: 'Прюитт: горизонтальные границы',
    values: [-1, -1, -1, 0, 0, 0, 1, 1, 1],
  },
  {
    id: 'prewitt-vertical',
    label: 'Прюитт: вертикальные границы',
    values: [-1, 0, 1, -1, 0, 1, -1, 0, 1],
  },
]

export const EDGE_HANDLING_OPTIONS: ReadonlyArray<{
  id: EdgeHandling
  label: string
}> = [
  { id: 'copy', label: 'Копирование' },
  { id: 'black', label: 'Заполнение чёрным' },
  { id: 'white', label: 'Заполнение белым' },
]

export async function applyKernelFilter(
  source: ImageData,
  settings: KernelFilterSettings,
  options: KernelFilterOptions = {},
): Promise<ImageData> {
  validateSettings(settings)
  throwIfAborted(options.signal)

  if (isIdentityKernel(settings.kernel)) {
    await yieldToBrowser()
    throwIfAborted(options.signal)
    options.onProgress?.({ phase: 'convolution', value: 1 })
    return new ImageData(new Uint8ClampedArray(source.data), source.width, source.height)
  }

  const padded = await createPaddedPixels(
    source,
    settings.edgeHandling,
    options,
  )
  const output = new Uint8ClampedArray(source.data)
  const selectedChannels = settings.channels.map((channel) => ({
    channel,
    offset: getChannelOffset(channel),
  }))
  const paddedWidth = source.width + 2
  const paddedRowStride = paddedWidth * 4
  const rowWork = Math.max(1, source.width * selectedChannels.length * 9)
  const rowsPerYield = Math.max(1, Math.floor(1_000_000 / rowWork))

  for (let y = 0; y < source.height; y += 1) {
    const topRow = y * paddedRowStride
    const middleRow = topRow + paddedRowStride
    const bottomRow = middleRow + paddedRowStride

    for (let x = 0; x < source.width; x += 1) {
      const topLeft = topRow + x * 4
      const middleLeft = middleRow + x * 4
      const bottomLeft = bottomRow + x * 4
      const targetIndex = (y * source.width + x) * 4

      for (const selected of selectedChannels) {
        const offset = selected.offset
        const value =
          padded[topLeft + offset] * settings.kernel[0]
          + padded[topLeft + 4 + offset] * settings.kernel[1]
          + padded[topLeft + 8 + offset] * settings.kernel[2]
          + padded[middleLeft + offset] * settings.kernel[3]
          + padded[middleLeft + 4 + offset] * settings.kernel[4]
          + padded[middleLeft + 8 + offset] * settings.kernel[5]
          + padded[bottomLeft + offset] * settings.kernel[6]
          + padded[bottomLeft + 4 + offset] * settings.kernel[7]
          + padded[bottomLeft + 8 + offset] * settings.kernel[8]
        const filteredValue = clampByte(value)

        if (selected.channel === 'gray') {
          output[targetIndex] = filteredValue
          output[targetIndex + 1] = filteredValue
          output[targetIndex + 2] = filteredValue
        } else {
          output[targetIndex + offset] = filteredValue
        }
      }
    }

    if ((y + 1) % rowsPerYield === 0 || y === source.height - 1) {
      options.onProgress?.({
        phase: 'convolution',
        value: (y + 1) / source.height,
      })
      await yieldToBrowser()
      throwIfAborted(options.signal)
    }
  }

  return new ImageData(output, source.width, source.height)
}

export function isIdentityKernel(kernel: readonly number[]): boolean {
  return kernel.length === 9 && kernel.every((value, index) => (
    value === (index === 4 ? 1 : 0)
  ))
}

export function isKernelAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

async function createPaddedPixels(
  source: ImageData,
  edgeHandling: EdgeHandling,
  options: KernelFilterOptions,
): Promise<Uint8ClampedArray> {
  const paddedWidth = source.width + 2
  const paddedHeight = source.height + 2
  const padded = new Uint8ClampedArray(paddedWidth * paddedHeight * 4)

  if (edgeHandling === 'white') {
    padded.fill(255)
  }

  const rowsPerYield = Math.max(
    1,
    Math.floor(2_000_000 / Math.max(1, source.width * 4)),
  )

  for (let y = 0; y < source.height; y += 1) {
    const sourceStart = y * source.width * 4
    const targetStart = ((y + 1) * paddedWidth + 1) * 4

    padded.set(
      source.data.subarray(sourceStart, sourceStart + source.width * 4),
      targetStart,
    )

    if (edgeHandling === 'copy') {
      copyPixel(padded, targetStart, padded, targetStart - 4)
      copyPixel(
        padded,
        targetStart + (source.width - 1) * 4,
        padded,
        targetStart + source.width * 4,
      )
    }

    if ((y + 1) % rowsPerYield === 0 || y === source.height - 1) {
      options.onProgress?.({
        phase: 'padding',
        value: (y + 1) / source.height,
      })
      await yieldToBrowser()
      throwIfAborted(options.signal)
    }
  }

  if (edgeHandling === 'copy') {
    const rowLength = paddedWidth * 4
    const firstRowStart = rowLength
    const lastRowStart = source.height * rowLength

    padded.set(padded.subarray(firstRowStart, firstRowStart + rowLength), 0)
    padded.set(
      padded.subarray(lastRowStart, lastRowStart + rowLength),
      (paddedHeight - 1) * rowLength,
    )
  }

  return padded
}

function getChannelOffset(channel: ImageChannel): number {
  if (channel === 'green') {
    return 1
  }

  if (channel === 'blue') {
    return 2
  }

  if (channel === 'alpha') {
    return 3
  }

  return 0
}

function copyPixel(
  source: Uint8ClampedArray,
  sourceIndex: number,
  target: Uint8ClampedArray,
  targetIndex: number,
): void {
  target[targetIndex] = source[sourceIndex]
  target[targetIndex + 1] = source[sourceIndex + 1]
  target[targetIndex + 2] = source[sourceIndex + 2]
  target[targetIndex + 3] = source[sourceIndex + 3]
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function validateSettings(settings: KernelFilterSettings): void {
  if (
    settings.kernel.length !== 9
    || settings.kernel.some((value) => !Number.isFinite(value))
  ) {
    throw new Error('Ядро должно содержать девять числовых коэффициентов.')
  }

  if (settings.channels.length === 0) {
    throw new Error('Не выбран ни один канал для фильтрации.')
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) {
    return
  }

  const error = new Error('Фильтрация отменена.')
  error.name = 'AbortError'
  throw error
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
