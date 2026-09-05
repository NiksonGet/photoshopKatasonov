import type { RasterDocument } from '../domain/image'

type StatusBarProps = {
  image: RasterDocument | null
  isLoading: boolean
  errorMessage: string
}

export function StatusBar({
  image,
  isLoading,
  errorMessage,
}: StatusBarProps) {
  const stateText = isLoading ? 'Открытие' : errorMessage ? 'Ошибка' : 'Готово'
  const documentText = image
    ? `${image.width} × ${image.height} px · ${image.colorDepth}`
    : 'Документ не открыт'

  return (
    <footer className="status-bar">
      <span className={`status-ready ${errorMessage ? 'status-failed' : ''}`}>
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
