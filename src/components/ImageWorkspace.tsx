import { ImagePlus, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, type MouseEvent } from 'react'
import type { PixelSample, RasterDocument } from '../domain/image'
import { samplePixel } from '../image/channelProcessing'
import { calculateFitScale } from '../image/imageScaling'

type ImageWorkspaceProps = {
  image: RasterDocument | null
  renderedPixels: ImageData | null
  sampleSource: ImageData | null
  fitRequestId: number
  isEyedropperActive: boolean
  isLoading: boolean
  errorMessage: string
  onAutoFit: (scale: number) => void
  onPixelSample: (sample: PixelSample) => void
}

export function ImageWorkspace({
  image,
  renderedPixels,
  sampleSource,
  fitRequestId,
  isEyedropperActive,
  isLoading,
  errorMessage,
  onAutoFit,
  onPixelSample,
}: ImageWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const handledFitRequestRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    if (!renderedPixels) {
      context.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    context.putImageData(renderedPixels, 0, 0)
  }, [renderedPixels])

  useLayoutEffect(() => {
    if (
      !image ||
      fitRequestId === 0 ||
      handledFitRequestRef.current === fitRequestId
    ) {
      return
    }

    const scrollArea = scrollAreaRef.current

    if (!scrollArea) {
      return
    }

    const bounds = scrollArea.getBoundingClientRect()

    if (bounds.width < 1 || bounds.height < 1) {
      return
    }

    handledFitRequestRef.current = fitRequestId
    onAutoFit(
      calculateFitScale(
        image.width,
        image.height,
        bounds.width,
        bounds.height,
      ),
    )
  }, [fitRequestId, image, onAutoFit])

  function handleCanvasClick(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current

    if (
      event.button !== 0 ||
      !canvas ||
      !sampleSource ||
      !isEyedropperActive
    ) {
      return
    }

    const bounds = canvas.getBoundingClientRect()

    if (bounds.width === 0 || bounds.height === 0) {
      return
    }

    const x = Math.floor(
      ((event.clientX - bounds.left) * sampleSource.width) / bounds.width,
    )
    const y = Math.floor(
      ((event.clientY - bounds.top) * sampleSource.height) / bounds.height,
    )

    if (
      x < 0 ||
      y < 0 ||
      x >= sampleSource.width ||
      y >= sampleSource.height
    ) {
      return
    }

    onPixelSample(samplePixel(sampleSource, x, y))
  }

  return (
    <main className="workspace">
      <div className="workspace-ruler workspace-ruler-horizontal" aria-hidden="true" />
      <div className="workspace-ruler workspace-ruler-vertical" aria-hidden="true" />

      <div className="workspace-scroll" ref={scrollAreaRef}>
        <div className={`canvas-frame ${image ? 'canvas-frame-loaded' : ''}`}>
          <canvas
            ref={canvasRef}
            className={`image-canvas ${isEyedropperActive ? 'image-canvas-eyedropper' : ''}`}
            width={renderedPixels?.width ?? 720}
            height={renderedPixels?.height ?? 420}
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
