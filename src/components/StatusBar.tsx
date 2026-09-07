import type { RasterDocument } from '../domain/image'
import { ZoomIn, ZoomOut } from 'lucide-react'
import {
  DISPLAY_SCALE_MAXIMUM,
  DISPLAY_SCALE_MINIMUM,
} from '../image/imageScaling'

type StatusBarProps = {
  image: RasterDocument | null
  isExporting: boolean
  isLoading: boolean
  errorMessage: string
  displayScale: number
  onDisplayScaleChange: (scale: number) => void
}

export function StatusBar({
  image,
  isExporting,
  isLoading,
  errorMessage,
  displayScale,
  onDisplayScaleChange,
}: StatusBarProps) {
  const stateText = isLoading
    ? 'Открытие'
    : isExporting
      ? 'Экспорт'
      : errorMessage
        ? 'Ошибка'
        : 'Готово'
  const statusClassName = errorMessage
    ? 'status-ready status-failed'
    : isLoading || isExporting
      ? 'status-ready status-busy'
      : 'status-ready'
  const documentText = image
    ? `${image.width} × ${image.height} px · ${image.colorDepth}`
    : 'Документ не открыт'

  return (
    <footer className="status-bar">
      <span className={statusClassName}>
        <i aria-hidden="true" />
        {stateText}
      </span>
      <span className="status-document" title={errorMessage || documentText}>
        {errorMessage || documentText}
      </span>
      <label className="status-scale" title="Масштаб отображения">
        <ZoomOut size={13} aria-hidden="true" />
        <input
          type="range"
          min={DISPLAY_SCALE_MINIMUM}
          max={DISPLAY_SCALE_MAXIMUM}
          step="1"
          value={displayScale}
          disabled={!image || isLoading}
          aria-label="Масштаб изображения"
          onChange={(event) => {
            onDisplayScaleChange(Number(event.currentTarget.value))
          }}
        />
        <ZoomIn size={13} aria-hidden="true" />
        <output>{displayScale}%</output>
      </label>
    </footer>
  )
}
