import type { ImageChannel } from '../domain/image'
import type { ChannelDefinition } from './channelProcessing'

export type LevelsTarget = 'master' | ImageChannel
export type HistogramScale = 'linear' | 'logarithmic'

export type LevelsInput = {
  blackPoint: number
  gamma: number
  whitePoint: number
}

export type LevelsSettings = Record<LevelsTarget, LevelsInput>

export type LevelsTargetOption = {
  id: LevelsTarget
  label: string
}

export const GAMMA_MINIMUM = 0.1
export const GAMMA_MAXIMUM = 9.9

const TARGET_LABELS: Record<LevelsTarget, string> = {
  master: 'Master',
  gray: 'Gray',
  red: 'Red',
  green: 'Green',
  blue: 'Blue',
  alpha: 'Alpha',
}

export function createLevelsSettings(): LevelsSettings {
  return {
    master: createDefaultInput(),
    gray: createDefaultInput(),
    red: createDefaultInput(),
    green: createDefaultInput(),
    blue: createDefaultInput(),
    alpha: createDefaultInput(),
  }
}

export function getLevelsTargets(
  channels: readonly ChannelDefinition[],
): LevelsTargetOption[] {
  return [
    { id: 'master', label: TARGET_LABELS.master },
    ...channels.map(({ id }) => ({ id, label: TARGET_LABELS[id] })),
  ]
}

export function normalizeLevels(input: LevelsInput): LevelsInput {
  const safeBlackPoint = Number.isFinite(input.blackPoint) ? input.blackPoint : 0
  const safeWhitePoint = Number.isFinite(input.whitePoint) ? input.whitePoint : 255
  const safeGamma = Number.isFinite(input.gamma) ? input.gamma : 1
  const blackPoint = clamp(Math.round(safeBlackPoint), 0, 253)
  const whitePoint = clamp(Math.round(safeWhitePoint), blackPoint + 2, 255)
  const gamma = clamp(roundToHundredths(safeGamma), GAMMA_MINIMUM, GAMMA_MAXIMUM)

  return { blackPoint, gamma, whitePoint }
}

export function calculateHistogram(
  pixels: ImageData,
  target: LevelsTarget,
): Uint32Array {
  const bins = new Uint32Array(256)

  for (let index = 0; index < pixels.data.length; index += 4) {
    const value = getToneValue(pixels.data, index, target)
    bins[value] += 1
  }

  return bins
}

export function applyLevelsCorrection(
  source: ImageData,
  settings: LevelsSettings,
  channels: readonly ChannelDefinition[],
): ImageData {
  const result = new Uint8ClampedArray(source.data.length)
  const channelIds = new Set(channels.map(({ id }) => id))
  const masterTable = createLookupTable(settings.master)
  const alphaTable = createLookupTable(settings.alpha)

  if (channelIds.has('gray')) {
    const grayTable = createLookupTable(settings.gray)

    for (let index = 0; index < source.data.length; index += 4) {
      const gray = grayTable[masterTable[source.data[index]]]
      result[index] = gray
      result[index + 1] = gray
      result[index + 2] = gray
      result[index + 3] = channelIds.has('alpha')
        ? alphaTable[source.data[index + 3]]
        : source.data[index + 3]
    }
  } else {
    const redTable = createLookupTable(settings.red)
    const greenTable = createLookupTable(settings.green)
    const blueTable = createLookupTable(settings.blue)

    for (let index = 0; index < source.data.length; index += 4) {
      result[index] = redTable[masterTable[source.data[index]]]
      result[index + 1] = greenTable[masterTable[source.data[index + 1]]]
      result[index + 2] = blueTable[masterTable[source.data[index + 2]]]
      result[index + 3] = channelIds.has('alpha')
        ? alphaTable[source.data[index + 3]]
        : source.data[index + 3]
    }
  }

  return new ImageData(result, source.width, source.height)
}

export function getGammaMarkerPosition(input: LevelsInput): number {
  const normalizedGamma =
    Math.log(input.gamma / GAMMA_MINIMUM) /
    Math.log(GAMMA_MAXIMUM / GAMMA_MINIMUM)
  const position = input.blackPoint +
    normalizedGamma * (input.whitePoint - input.blackPoint)

  return clamp(position, input.blackPoint + 1, input.whitePoint - 1)
}

export function getGammaFromMarker(
  markerPosition: number,
  blackPoint: number,
  whitePoint: number,
): number {
  const normalizedPosition = clamp(
    (markerPosition - blackPoint) / (whitePoint - blackPoint),
    0,
    1,
  )
  const gamma = GAMMA_MINIMUM *
    (GAMMA_MAXIMUM / GAMMA_MINIMUM) ** normalizedPosition

  return clamp(roundToHundredths(gamma), GAMMA_MINIMUM, GAMMA_MAXIMUM)
}

function createDefaultInput(): LevelsInput {
  return { blackPoint: 0, gamma: 1, whitePoint: 255 }
}

function createLookupTable(input: LevelsInput): Uint8ClampedArray {
  const normalized = normalizeLevels(input)
  const table = new Uint8ClampedArray(256)
  const inputRange = normalized.whitePoint - normalized.blackPoint

  for (let value = 0; value < table.length; value += 1) {
    if (value <= normalized.blackPoint) {
      table[value] = 0
    } else if (value >= normalized.whitePoint) {
      table[value] = 255
    } else {
      const relativeTone = (value - normalized.blackPoint) / inputRange
      table[value] = Math.round(255 * relativeTone ** normalized.gamma)
    }
  }

  return table
}

function getToneValue(
  data: Uint8ClampedArray,
  index: number,
  target: LevelsTarget,
): number {
  if (target === 'master') {
    return Math.round(
      data[index] * 0.299 +
      data[index + 1] * 0.587 +
      data[index + 2] * 0.114,
    )
  }

  if (target === 'green') {
    return data[index + 1]
  }

  if (target === 'blue') {
    return data[index + 2]
  }

  if (target === 'alpha') {
    return data[index + 3]
  }

  return data[index]
}

function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}
