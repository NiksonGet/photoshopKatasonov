import { ImagePlus, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, type MouseEvent } from 'react'
import type { PixelSample, RasterDocument } from '../domain/image'
import { samplePixel } from '../image/channelProcessing'

type ImageWorkspaceProps = {
  image: RasterDocument | null
  displayedPixels: ImageData | null
  isEyedropperActive: boolean
  isLoading: boolean
  errorMessage: string
  onPixelSample: (sample: PixelSample) => void
}

export function ImageWorkspace({
  image,
  displayedPixels,
  isEyedropperActive,
  isLoading,
  errorMessage,
  onPixelSample,
}: ImageWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    if (!displayedPixels) {
      context.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    context.putImageData(displayedPixels, 0, 0)
  }, [displayedPixels])

  function handleCanvasClick(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current

    if (
      event.button !== 0 ||
      !canvas ||
      !displayedPixels ||
      !isEyedropperActive
    ) {
      return
    }

    const bounds = canvas.getBoundingClientRect()

    if (bounds.width === 0 || bounds.height === 0) {
      return
    }

    const x = Math.floor(
      ((event.clientX - bounds.left) * displayedPixels.width) / bounds.width,
    )
    const y = Math.floor(
      ((event.clientY - bounds.top) * displayedPixels.height) / bounds.height,
    )

    if (
      x < 0 ||
      y < 0 ||
      x >= displayedPixels.width ||
      y >= displayedPixels.height
    ) {
      return
    }

    onPixelSample(samplePixel(displayedPixels, x, y))
  }

  return (
    <main className="workspace">
      <div className="workspace-ruler workspace-ruler-horizontal" aria-hidden="true" />
      <div className="workspace-ruler workspace-ruler-vertical" aria-hidden="true" />

      <div className="workspace-scroll">
        <div className={`canvas-frame ${image ? 'canvas-frame-loaded' : ''}`}>
          <canvas
            ref={canvasRef}
            className={`image-canvas ${isEyedropperActive ? 'image-canvas-eyedropper' : ''}`}
            width={image?.width ?? 720}
            height={image?.height ?? 420}
            aria-label="Рабочий холст изображения"
            onClick={handleCanvasClick}
          />
          {!image && !isLoading && (
            <div className="empty-document">
              <span className="empty-icon">
                <ImagePlus size={30} strokeWidth={1.6} />
              </span>
              <strong>Откройте изображение</strong>
              <span>PNG, JPG или GB7</span>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="workspace-notice" role="status">
          <LoaderCircle className="notice-spinner" size={18} />
          Чтение изображения...
        </div>
      )}

      {errorMessage && !isLoading && (
        <div className="workspace-notice workspace-error" role="alert">
          <TriangleAlert size={18} />
          {errorMessage}
        </div>
      )}
    </main>
  )
}
