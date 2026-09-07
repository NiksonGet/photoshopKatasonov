export type InterpolationMethod = 'nearest' | 'bilinear'

export type InterpolationOption = {
  id: InterpolationMethod
  label: string
  description: string
}

type Resampler = (
  source: ImageData,
  targetWidth: number,
  targetHeight: number,
) => ImageData

export const DISPLAY_SCALE_MINIMUM = 12
export const DISPLAY_SCALE_MAXIMUM = 300
export const DEFAULT_INTERPOLATION: InterpolationMethod = 'bilinear'
export const MAX_RESIZE_DIMENSION = 16_384
export const MAX_RESIZE_PIXELS = 64_000_000

export const INTERPOLATION_OPTIONS: InterpolationOption[] = [
  {
    id: 'nearest',
    label: 'Ближайший сосед',
    description: 'Самый быстрый метод. Сохраняет резкие границы и подходит для пиксельной графики.',
  },
  {
    id: 'bilinear',
    label: 'Билинейная',
    description: 'Смешивает четыре соседних пикселя и даёт более плавный результат для фотографий.',
  },
]

const RESAMPLERS: Record<InterpolationMethod, Resampler> = {
  nearest: resizeWithNearestNeighbor,
  bilinear: resizeWithBilinearInterpolation,
}

export function resizeImageData(
  source: ImageData,
  targetWidth: number,
  targetHeight: number,
  method: InterpolationMethod = DEFAULT_INTERPOLATION,
): ImageData {
  const width = Math.round(targetWidth)
  const height = Math.round(targetHeight)

  if (width < 1 || height < 1) {
    throw new Error('Ширина и высота изображения должны быть больше нуля.')
  }

  if (width === source.width && height === source.height) {
    return source
  }

  return RESAMPLERS[method](source, width, height)
}

export function calculateFitScale(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = 50,
): number {
  const availableWidth = Math.max(1, viewportWidth - margin * 2)
  const availableHeight = Math.max(1, viewportHeight - margin * 2)
  const rawScale = Math.min(
    (availableWidth / imageWidth) * 100,
    (availableHeight / imageHeight) * 100,
  )

  return clampDisplayScale(Math.floor(rawScale))
}

export function clampDisplayScale(scale: number): number {
  return Math.min(
    DISPLAY_SCALE_MAXIMUM,
    Math.max(DISPLAY_SCALE_MINIMUM, Math.round(scale)),
  )
}

export function getScaledDimensions(
  width: number,
  height: number,
  scalePercent: number,
): { width: number; height: number } {
  const multiplier = clampDisplayScale(scalePercent) / 100

  return {
    width: Math.max(1, Math.round(width * multiplier)),
    height: Math.max(1, Math.round(height * multiplier)),
  }
}

function resizeWithNearestNeighbor(
  source: ImageData,
  targetWidth: number,
  targetHeight: number,
): ImageData {
  const output = new Uint8ClampedArray(targetWidth * targetHeight * 4)
  const sourceXByTargetX = new Uint32Array(targetWidth)

  for (let x = 0; x < targetWidth; x += 1) {
    sourceXByTargetX[x] = Math.min(
      source.width - 1,
      Math.floor(((x + 0.5) * source.width) / targetWidth),
    )
  }

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(
      source.height - 1,
      Math.floor(((y + 0.5) * source.height) / targetHeight),
    )

    for (let x = 0; x < targetWidth; x += 1) {
      const sourceIndex = (sourceY * source.width + sourceXByTargetX[x]) * 4
      const targetIndex = (y * targetWidth + x) * 4

      output[targetIndex] = source.data[sourceIndex]
      output[targetIndex + 1] = source.data[sourceIndex + 1]
      output[targetIndex + 2] = source.data[sourceIndex + 2]
      output[targetIndex + 3] = source.data[sourceIndex + 3]
    }
  }

  return new ImageData(output, targetWidth, targetHeight)
}

function resizeWithBilinearInterpolation(
  source: ImageData,
  targetWidth: number,
  targetHeight: number,
): ImageData {
  const output = new Uint8ClampedArray(targetWidth * targetHeight * 4)
  const leftByX = new Uint32Array(targetWidth)
  const rightByX = new Uint32Array(targetWidth)
  const horizontalWeightByX = new Float32Array(targetWidth)

  for (let x = 0; x < targetWidth; x += 1) {
    const sourceX = ((x + 0.5) * source.width) / targetWidth - 0.5
    const left = Math.floor(sourceX)

    leftByX[x] = clampIndex(left, source.width)
    rightByX[x] = clampIndex(left + 1, source.width)
    horizontalWeightByX[x] = sourceX - left
  }

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = ((y + 0.5) * source.height) / targetHeight - 0.5
    const top = Math.floor(sourceY)
    const topY = clampIndex(top, source.height)
    const bottomY = clampIndex(top + 1, source.height)
    const verticalWeight = sourceY - top

    for (let x = 0; x < targetWidth; x += 1) {
      const leftX = leftByX[x]
      const rightX = rightByX[x]
      const horizontalWeight = horizontalWeightByX[x]
      const topLeftIndex = (topY * source.width + leftX) * 4
      const topRightIndex = (topY * source.width + rightX) * 4
      const bottomLeftIndex = (bottomY * source.width + leftX) * 4
      const bottomRightIndex = (bottomY * source.width + rightX) * 4
      const targetIndex = (y * targetWidth + x) * 4

      for (let channel = 0; channel < 4; channel += 1) {
        const topValue = mix(
          source.data[topLeftIndex + channel],
          source.data[topRightIndex + channel],
          horizontalWeight,
        )
        const bottomValue = mix(
          source.data[bottomLeftIndex + channel],
          source.data[bottomRightIndex + channel],
          horizontalWeight,
        )

        output[targetIndex + channel] = Math.round(
          mix(topValue, bottomValue, verticalWeight),
        )
      }
    }
  }

  return new ImageData(output, targetWidth, targetHeight)
}

function clampIndex(index: number, length: number): number {
  return Math.min(length - 1, Math.max(0, index))
}

function mix(start: number, end: number, amount: number): number {
  return start + (end - start) * amount
}
