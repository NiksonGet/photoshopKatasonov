import type { RasterDocument } from '../domain/image'
import {
  detectBrowserFormat,
  loadBrowserImage,
} from './browserImageLoader'
import { loadGb7Image } from './gb7Codec'

export async function openImageFile(file: File): Promise<RasterDocument> {
  if (file.name.toLowerCase().endsWith('.gb7')) {
    return loadGb7Image(file)
  }

  if (detectBrowserFormat(file)) {
    return loadBrowserImage(file)
  }

  throw new Error('Поддерживаются только изображения PNG, JPG, JPEG и GB7.')
}

