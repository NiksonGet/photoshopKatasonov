import type {
  ExportImageFormat,
  RasterDocument,
} from '../domain/image'
import { encodeGb7 } from './gb7Codec'

type ImageExport = {
  blob: Blob
  fileName: string
}

const MIME_TYPES: Record<ExportImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  gb7: 'application/octet-stream',
}

const FILE_EXTENSIONS: Record<ExportImageFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  gb7: 'gb7',
}

export async function createImageExport(
  image: RasterDocument,
  format: ExportImageFormat,
): Promise<ImageExport> {
  const blob = format === 'gb7'
    ? createGb7Blob(image.pixels)
    : await createBrowserImageBlob(image.pixels, format)

  return {
    blob,
    fileName: createExportFileName(image.fileName, format),
  }
}

export function downloadImageExport({ blob, fileName }: ImageExport): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = fileName
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

function createGb7Blob(pixels: ImageData): Blob {
  const encoded = encodeGb7(pixels)
  const bytes = new Uint8Array(encoded.byteLength)
  bytes.set(encoded)

  return new Blob([bytes.buffer], { type: MIME_TYPES.gb7 })
}

async function createBrowserImageBlob(
  pixels: ImageData,
  format: Exclude<ExportImageFormat, 'gb7'>,
): Promise<Blob> {
  const sourceCanvas = createCanvas(pixels.width, pixels.height)
  const sourceContext = sourceCanvas.getContext('2d')

  if (!sourceContext) {
    throw new Error('Не удалось подготовить изображение к экспорту.')
  }

  sourceContext.putImageData(pixels, 0, 0)

  let exportCanvas = sourceCanvas

  if (format === 'jpeg') {
    exportCanvas = createCanvas(pixels.width, pixels.height)
    const exportContext = exportCanvas.getContext('2d')

    if (!exportContext) {
      throw new Error('Не удалось подготовить JPG к экспорту.')
    }

    exportContext.fillStyle = '#ffffff'
    exportContext.fillRect(0, 0, pixels.width, pixels.height)
    exportContext.drawImage(sourceCanvas, 0, 0)
  }

  return canvasToBlob(exportCanvas, MIME_TYPES[format])
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }

        reject(new Error('Браузер не смог сформировать файл изображения.'))
      },
      mimeType,
      mimeType === MIME_TYPES.jpeg ? 0.92 : undefined,
    )
  })
}

function createExportFileName(
  sourceName: string,
  format: ExportImageFormat,
): string {
  const extensionPosition = sourceName.lastIndexOf('.')
  const nameWithoutExtension = extensionPosition > 0
    ? sourceName.slice(0, extensionPosition)
    : sourceName
  const baseName = nameWithoutExtension.trim() || 'image'

  return `${baseName}.${FILE_EXTENSIONS[format]}`
}
