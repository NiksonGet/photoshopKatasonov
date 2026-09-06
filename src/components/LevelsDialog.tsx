import { RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RasterDocument } from '../domain/image'
import type { ChannelDefinition } from '../image/channelProcessing'
import {
  applyLevelsCorrection,
  calculateHistogram,
  createLevelsSettings,
  GAMMA_MAXIMUM,
  GAMMA_MINIMUM,
  getGammaFromMarker,
  getGammaMarkerPosition,
  getLevelsTargets,
  normalizeLevels,
  type HistogramScale,
  type LevelsInput,
  type LevelsSettings,
  type LevelsTarget,
} from '../image/levelsProcessing'

type LevelsDialogProps = {
  image: RasterDocument
  channels: ChannelDefinition[]
  onPreview: (pixels: ImageData | null) => void
  onApply: (pixels: ImageData) => void
  onCancel: () => void
}

export function LevelsDialog({
  image,
  channels,
  onPreview,
  onApply,
  onCancel,
}: LevelsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [selectedTarget, setSelectedTarget] = useState<LevelsTarget>('master')
  const [histogramScale, setHistogramScale] = useState<HistogramScale>('linear')
  const [previewEnabled, setPreviewEnabled] = useState(true)
  const [settings, setSettings] = useState<LevelsSettings>(createLevelsSettings)
  const targets = useMemo(() => getLevelsTargets(channels), [channels])
  const histogram = useMemo(
    () => calculateHistogram(image.pixels, selectedTarget),
    [image, selectedTarget],
  )
  const selectedInput = settings[selectedTarget]
  const gammaMarker = getGammaMarkerPosition(selectedInput)

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    dialog.show()

    return () => {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [])

  useEffect(() => {
    if (!previewEnabled) {
      onPreview(null)
      return
    }

    const frameId = requestAnimationFrame(() => {
      onPreview(applyLevelsCorrection(image.pixels, settings, channels))
    })

    return () => cancelAnimationFrame(frameId)
  }, [channels, image, onPreview, previewEnabled, settings])

  function updateSelectedInput(patch: Partial<LevelsInput>) {
    setSettings((current) => ({
      ...current,
      [selectedTarget]: normalizeLevels({
        ...current[selectedTarget],
        ...patch,
      }),
    }))
  }

  function handleBlackPoint(value: number) {
    updateSelectedInput({
      blackPoint: Math.min(value, selectedInput.whitePoint - 2),
    })
  }

  function handleWhitePoint(value: number) {
    updateSelectedInput({
      whitePoint: Math.max(value, selectedInput.blackPoint + 2),
    })
  }

  function handleCancel() {
    onPreview(null)
    onCancel()
  }

  return (
    <dialog
      className="levels-dialog"
      ref={dialogRef}
      aria-labelledby="levels-title"
      onCancel={(event) => {
        event.preventDefault()
        handleCancel()
      }}
    >
      <header className="levels-dialog-header">
        <span>
          <small>Градационная коррекция</small>
          <h2 id="levels-title">Уровни</h2>
        </span>
        <button
          className="dialog-icon-button"
          type="button"
          title="Закрыть"
          aria-label="Закрыть уровни"
          onClick={handleCancel}
        >
          <X size={18} />
        </button>
      </header>

      <div className="levels-toolbar">
        <label className="levels-field" htmlFor="levels-target">
          <span>Канал</span>
          <select
            id="levels-target"
            value={selectedTarget}
            onChange={(event) => {
              setSelectedTarget(event.currentTarget.value as LevelsTarget)
            }}
          >
            {targets.map((target) => (
              <option value={target.id} key={target.id}>{target.label}</option>
            ))}
          </select>
        </label>

        <div className="histogram-mode" role="group" aria-label="Масштаб гистограммы">
          <button
            type="button"
            aria-pressed={histogramScale === 'linear'}
            onClick={() => setHistogramScale('linear')}
          >
            Линейная
          </button>
          <button
            type="button"
            aria-pressed={histogramScale === 'logarithmic'}
            onClick={() => setHistogramScale('logarithmic')}
          >
            Логарифмическая
          </button>
        </div>
      </div>

      <HistogramPlot
        histogram={histogram}
        scale={histogramScale}
        target={selectedTarget}
      />

      <section className="input-levels" aria-labelledby="input-levels-title">
        <div className="input-levels-heading">
          <h3 id="input-levels-title">Входные уровни</h3>
          <span>0–255</span>
        </div>

        <div className="levels-track">
          <span className="levels-gradient" aria-hidden="true" />
          <input
            className="levels-marker levels-marker-black"
            type="range"
            min="0"
            max="255"
            step="1"
            value={selectedInput.blackPoint}
            aria-label="Точка чёрного"
            onChange={(event) => handleBlackPoint(Number(event.currentTarget.value))}
          />
          <input
            className="levels-marker levels-marker-gamma"
            type="range"
            min="0"
            max="255"
            step="0.1"
            value={gammaMarker}
            aria-label="Положение полутонов"
            onChange={(event) => {
              const marker = Math.min(
                selectedInput.whitePoint - 1,
                Math.max(
                  selectedInput.blackPoint + 1,
                  Number(event.currentTarget.value),
                ),
              )
              updateSelectedInput({
                gamma: getGammaFromMarker(
                  marker,
                  selectedInput.blackPoint,
                  selectedInput.whitePoint,
                ),
              })
            }}
          />
          <input
            className="levels-marker levels-marker-white"
            type="range"
            min="0"
            max="255"
            step="1"
            value={selectedInput.whitePoint}
            aria-label="Точка белого"
            onChange={(event) => handleWhitePoint(Number(event.currentTarget.value))}
          />
        </div>

        <div className="levels-numeric-grid">
          <label>
            <span>Чёрная точка</span>
            <input
              type="number"
              min="0"
              max={selectedInput.whitePoint - 2}
              step="1"
              value={selectedInput.blackPoint}
              onChange={(event) => handleBlackPoint(Number(event.currentTarget.value))}
            />
          </label>
          <label>
            <span>Гамма</span>
            <input
              type="number"
              min={GAMMA_MINIMUM}
              max={GAMMA_MAXIMUM}
              step="0.01"
              value={selectedInput.gamma}
              onChange={(event) => {
                updateSelectedInput({ gamma: Number(event.currentTarget.value) })
              }}
            />
          </label>
          <label>
            <span>Белая точка</span>
            <input
              type="number"
              min={selectedInput.blackPoint + 2}
              max="255"
              step="1"
              value={selectedInput.whitePoint}
              onChange={(event) => handleWhitePoint(Number(event.currentTarget.value))}
            />
          </label>
        </div>
      </section>

      <footer className="levels-dialog-footer">
        <label className="preview-toggle">
          <input
            type="checkbox"
            checked={previewEnabled}
            onChange={(event) => setPreviewEnabled(event.currentTarget.checked)}
          />
          <span>Предпросмотр</span>
        </label>

        <div className="levels-actions">
          <button
            className="reset-button"
            type="button"
            onClick={() => setSettings(createLevelsSettings())}
          >
            <RotateCcw size={15} />
            Сбросить
          </button>
          <button type="button" onClick={handleCancel}>Отмена</button>
          <button
            className="apply-levels-button"
            type="button"
            onClick={() => {
              onApply(applyLevelsCorrection(image.pixels, settings, channels))
            }}
          >
            Применить
          </button>
        </div>
      </footer>
    </dialog>
  )
}

type HistogramPlotProps = {
  histogram: Uint32Array
  scale: HistogramScale
  target: LevelsTarget
}

function HistogramPlot({ histogram, scale, target }: HistogramPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const maximumCount = Math.max(...histogram, 1)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const transformedMaximum = scale === 'logarithmic'
      ? Math.log1p(maximumCount)
      : maximumCount
    const barWidth = canvas.width / histogram.length

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#191b1e'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = '#35383d'
    context.lineWidth = 1

    for (let division = 1; division < 4; division += 1) {
      const x = Math.round((canvas.width * division) / 4) + 0.5
      context.beginPath()
      context.moveTo(x, 0)
      context.lineTo(x, canvas.height)
      context.stroke()
    }

    context.fillStyle = getHistogramColor(target)

    histogram.forEach((count, tone) => {
      const transformedCount = scale === 'logarithmic'
        ? Math.log1p(count)
        : count
      const height = Math.max(
        count === 0 ? 0 : 1,
        Math.round((transformedCount / transformedMaximum) * (canvas.height - 8)),
      )

      context.fillRect(
        Math.floor(tone * barWidth),
        canvas.height - height,
        Math.max(1, Math.ceil(barWidth)),
        height,
      )
    })
  }, [histogram, maximumCount, scale, target])

  return (
    <figure className="histogram-figure">
      <figcaption>
        <span>Гистограмма</span>
        <small>Максимум: {maximumCount.toLocaleString('ru-RU')} пикс.</small>
      </figcaption>
      <canvas
        ref={canvasRef}
        width="512"
        height="148"
        aria-label={`Гистограмма канала ${target}`}
      />
      <div className="histogram-axis" aria-hidden="true">
        <span>0</span>
        <span>127</span>
        <span>255</span>
      </div>
    </figure>
  )
}

function getHistogramColor(target: LevelsTarget): string {
  const colors: Record<LevelsTarget, string> = {
    master: '#e9e3d8',
    gray: '#c6c4bf',
    red: '#e1644b',
    green: '#45b586',
    blue: '#5e91df',
    alpha: '#b7d8d9',
  }

  return colors[target]
}
