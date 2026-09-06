import type { RasterDocument } from '../domain/image'

type StatusBarProps = {
  image: RasterDocument | null
  isExporting: boolean
  isLoading: boolean
  errorMessage: string
}

export function StatusBar({
  image,
  isExporting,
  isLoading,
  errorMessage,
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
      <span className="status-scale">100%</span>
    </footer>
  )
}
