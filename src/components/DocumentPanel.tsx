import type {
  ChannelVisibility,
  ImageChannel,
  PixelSample,
  RasterDocument,
} from '../domain/image'
import type { ChannelDefinition } from '../image/channelProcessing'
import { ChannelPanel } from './ChannelPanel'

type DocumentPanelProps = {
  image: RasterDocument | null
  channels: ChannelDefinition[]
  channelVisibility: ChannelVisibility
  pixelSample: PixelSample | null
  onToggleChannel: (channel: ImageChannel) => void
}

export function DocumentPanel({
  image,
  channels,
  channelVisibility,
  pixelSample,
  onToggleChannel,
}: DocumentPanelProps) {
  const details = [
    ['Имя', image?.fileName ?? '—'],
    ['Размер', image ? `${image.width} × ${image.height}` : '— × —'],
    ['Пиксели', image ? formatPixelCount(image.width * image.height) : '—'],
    ['Объём', image ? formatFileSize(image.fileSizeBytes) : '—'],
    ['Формат', image ? getFormatLabel(image) : '—'],
    ['Каналы', image ? String(image.sourceChannels) : '—'],
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

      <ChannelPanel
        image={image}
        channels={channels}
        visibility={channelVisibility}
        sample={pixelSample}
        onToggle={onToggleChannel}
      />

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

function formatPixelCount(pixelCount: number): string {
  if (pixelCount >= 1_000_000) {
    return `${formatNumber(pixelCount / 1_000_000, 2)} Мп`
  }

  return `${formatNumber(pixelCount, 0)} px`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} Б`
  }

  if (bytes < 1024 ** 2) {
    return `${formatNumber(bytes / 1024, 1)} КБ`
  }

  return `${formatNumber(bytes / 1024 ** 2, 2)} МБ`
}

function formatNumber(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits }).format(value)
}
