import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type {
  ChannelVisibility,
  ImageChannel,
  PixelSample,
  RasterDocument,
} from '../domain/image'
import {
  createChannelThumbnail,
  type ChannelDefinition,
} from '../image/channelProcessing'

type ChannelPanelProps = {
  image: RasterDocument | null
  channels: ChannelDefinition[]
  visibility: ChannelVisibility
  sample: PixelSample | null
  onToggle: (channel: ImageChannel) => void
}

export function ChannelPanel({
  image,
  channels,
  visibility,
  sample,
  onToggle,
}: ChannelPanelProps) {
  return (
    <>
      <section className="inspector-section channel-section">
        <div className="section-heading">
          <h2>Каналы</h2>
          <span>{image ? formatChannelCount(channels.length) : 'Нет данных'}</span>
        </div>

        {image ? (
          <div className="channel-list">
            {channels.map((channel) => {
              const isVisible = visibility[channel.id]

              return (
                <button
                  className={`channel-row ${isVisible ? '' : 'channel-row-muted'}`}
                  type="button"
                  aria-label={`${channel.label}: ${isVisible ? 'включён' : 'выключен'}`}
                  aria-pressed={isVisible}
                  key={channel.id}
                  onClick={() => onToggle(channel.id)}
                >
                  <span className="channel-thumbnail-shell">
                    <ChannelThumbnail image={image} channel={channel.id} />
                  </span>
                  <span className="channel-copy">
                    <strong>{channel.shortLabel}</strong>
                    <small>{channel.label}</small>
                  </span>
                  <span className="channel-state" aria-hidden="true">
                    {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                    <small>{isVisible ? 'Вкл' : 'Выкл'}</small>
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="empty-history">Каналы не определены</p>
        )}
      </section>

      <section className="inspector-section sample-section">
        <div className="section-heading">
          <h2>Пипетка</h2>
          <span>RGB · CIELAB</span>
        </div>

        {sample ? <PixelDetails sample={sample} /> : (
          <p className="empty-history">Пиксель не выбран</p>
        )}
      </section>
    </>
  )
}

type ChannelThumbnailProps = {
  image: RasterDocument
  channel: ImageChannel
}

function ChannelThumbnail({ image, channel }: ChannelThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const thumbnail = createChannelThumbnail(image.pixels, channel)
    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    canvas.width = thumbnail.width
    canvas.height = thumbnail.height
    context.putImageData(thumbnail, 0, 0)
  }, [channel, image])

  return <canvas ref={canvasRef} className="channel-thumbnail" aria-hidden="true" />
}

function PixelDetails({ sample }: { sample: PixelSample }) {
  return (
    <div className="pixel-details">
      <div className="pixel-summary">
        <span className="sample-swatch-shell" aria-hidden="true">
          <i
            style={{
              backgroundColor: `rgba(${sample.red}, ${sample.green}, ${sample.blue}, ${sample.alpha / 255})`,
            }}
          />
        </span>
        <span>
          <strong>X {sample.x} · Y {sample.y}</strong>
          <small>Координаты пикселя</small>
        </span>
      </div>

      <dl className="pixel-values">
        <div><dt>R</dt><dd>{sample.red}</dd></div>
        <div><dt>G</dt><dd>{sample.green}</dd></div>
        <div><dt>B</dt><dd>{sample.blue}</dd></div>
        <div><dt>A</dt><dd>{sample.alpha}</dd></div>
        <div><dt>L*</dt><dd>{formatLab(sample.lab.lightness)}</dd></div>
        <div><dt>a*</dt><dd>{formatLab(sample.lab.a)}</dd></div>
        <div><dt>b*</dt><dd>{formatLab(sample.lab.b)}</dd></div>
      </dl>
    </div>
  )
}

function formatChannelCount(count: number): string {
  return count === 1 ? '1 канал' : `${count} канала`
}

function formatLab(value: number): string {
  return value.toFixed(2)
}
