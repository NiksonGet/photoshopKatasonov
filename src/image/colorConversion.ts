import type { LabColor } from '../domain/image'

const REFERENCE_WHITE = {
  x: 0.95047,
  y: 1,
  z: 1.08883,
}

export function convertRgbToLab(
  red: number,
  green: number,
  blue: number,
): LabColor {
  const linearRed = linearizeSrgb(red / 255)
  const linearGreen = linearizeSrgb(green / 255)
  const linearBlue = linearizeSrgb(blue / 255)

  const x =
    linearRed * 0.4124564 +
    linearGreen * 0.3575761 +
    linearBlue * 0.1804375
  const y =
    linearRed * 0.2126729 +
    linearGreen * 0.7151522 +
    linearBlue * 0.072175
  const z =
    linearRed * 0.0193339 +
    linearGreen * 0.119192 +
    linearBlue * 0.9503041

  const labX = transformXyz(x / REFERENCE_WHITE.x)
  const labY = transformXyz(y / REFERENCE_WHITE.y)
  const labZ = transformXyz(z / REFERENCE_WHITE.z)

  return {
    lightness: roundLabValue(116 * labY - 16),
    a: roundLabValue(500 * (labX - labY)),
    b: roundLabValue(200 * (labY - labZ)),
  }
}

function linearizeSrgb(value: number): number {
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4
}

function transformXyz(value: number): number {
  const delta = 6 / 29

  return value > delta ** 3
    ? Math.cbrt(value)
    : value / (3 * delta ** 2) + 4 / 29
}

function roundLabValue(value: number): number {
  return Math.round(value * 100) / 100
}
