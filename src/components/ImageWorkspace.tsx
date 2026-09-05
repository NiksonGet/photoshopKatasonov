import { ImagePlus } from 'lucide-react'

export function ImageWorkspace() {
  return (
    <main className="workspace">
      <div className="workspace-ruler workspace-ruler-horizontal" aria-hidden="true" />
      <div className="workspace-ruler workspace-ruler-vertical" aria-hidden="true" />

      <div className="workspace-scroll">
        <div className="canvas-frame">
          <canvas
            className="image-canvas"
            width="720"
            height="420"
            aria-label="Рабочий холст изображения"
          />
          <div className="empty-document" aria-hidden="true">
            <span className="empty-icon">
              <ImagePlus size={30} strokeWidth={1.6} />
            </span>
            <strong>Откройте изображение</strong>
            <span>PNG, JPG или GB7</span>
          </div>
        </div>
      </div>
    </main>
  )
}

