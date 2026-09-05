import type { RasterDocument } from '../domain/image'

type DocumentPanelProps = {
  image: RasterDocument | null
}

export function DocumentPanel({ image }: DocumentPanelProps) {
  const details = [
    ['Имя', image?.fileName ?? '—'],
    ['Размер', image ? `${image.width} × ${image.height}` : '— × —'],
    ['Формат', image ? getFormatLabel(image) : '—'],
    ['Глубина', image?.colorDepth ?? '—'],
  ]

  return (
    <aside className="document-panel" aria-label="Свойства документа">
      <section className="inspector-section">
        <div className="section-heading">
          <h2>Документ</h2>
          <span>Исходные данные</span>
        </div>

        <dl className="document-details">
          {details.map(([term, value]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd title={value}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="inspector-section history-section">
        <div className="section-heading">
          <h2>История</h2>
          <span>{image ? '1 действие' : '0 действий'}</span>
        </div>
        <p className="empty-history">
          {image ? 'Изображение открыто' : 'История изменений пуста'}
        </p>
      </section>
    </aside>
  )
}

function getFormatLabel(image: RasterDocument): string {
  return image.format === 'jpeg' ? 'JPEG' : image.format.toUpperCase()
}
