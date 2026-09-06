import { ImagePlus, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { RasterDocument } from '../domain/image'

type ImageWorkspaceProps = {
  image: RasterDocument | null
  isLoading: boolean
  errorMessage: string
}

export function ImageWorkspace({
  image,
  isLoading,
  errorMessage,
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

    if (!image) {
      context.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    context.putImageData(image.pixels, 0, 0)
  }, [image])

  return (
    <main className="workspace">
      <div className="workspace-ruler workspace-ruler-horizontal" aria-hidden="true" />
      <div className="workspace-ruler workspace-ruler-vertical" aria-hidden="true" />

      <div className="workspace-scroll">
        <div className={`canvas-frame ${image ? 'canvas-frame-loaded' : ''}`}>
          <canvas
            ref={canvasRef}
            className="image-canvas"
            width={image?.width ?? 720}
            height={image?.height ?? 420}
            aria-label="Рабочий холст изображения"
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
