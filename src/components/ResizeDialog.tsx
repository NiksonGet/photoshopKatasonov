import { CircleHelp, Link, Link2Off, LoaderCircle, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RasterDocument } from '../domain/image'
import {
  DEFAULT_INTERPOLATION,
  INTERPOLATION_OPTIONS,
  MAX_RESIZE_DIMENSION,
  MAX_RESIZE_PIXELS,
  resizeImageData,
  type InterpolationMethod,
} from '../image/imageScaling'

type ResizeUnit = 'percent' | 'pixels'

type ResizeDialogProps = {
  image: RasterDocument
  onApply: (pixels: ImageData) => void
  onCancel: () => void
}

type ResizeCalculation = {
  width: number
  height: number
  error: string
}

export function ResizeDialog({ image, onApply, onCancel }: ResizeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [unit, setUnit] = useState<ResizeUnit>('percent')
  const [widthValue, setWidthValue] = useState('100')
  const [heightValue, setHeightValue] = useState('100')
  const [keepAspectRatio, setKeepAspectRatio] = useState(true)
  const [interpolation, setInterpolation] = useState<InterpolationMethod>(
    DEFAULT_INTERPOLATION,
  )
  const [processingError, setProcessingError] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const calculation = useMemo(
    () => calculateTargetSize(image, unit, widthValue, heightValue),
    [heightValue, image, unit, widthValue],
  )
  const selectedInterpolation = INTERPOLATION_OPTIONS.find(
    ({ id }) => id === interpolation,
  ) ?? INTERPOLATION_OPTIONS[0]

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    dialog.showModal()

    return () => {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [])

  function updateWidth(nextValue: string) {
    setWidthValue(nextValue)
    setProcessingError('')

    if (!keepAspectRatio) {
      return
    }

    const value = Number(nextValue)

    if (!Number.isFinite(value) || value <= 0) {
      return
    }

    setHeightValue(
      unit === 'percent'
        ? nextValue
        : String(Math.max(1, Math.round((value * image.height) / image.width))),
    )
  }

  function updateHeight(nextValue: string) {
    setHeightValue(nextValue)
    setProcessingError('')

    if (!keepAspectRatio) {
      return
    }

    const value = Number(nextValue)

    if (!Number.isFinite(value) || value <= 0) {
      return
    }

    setWidthValue(
      unit === 'percent'
        ? nextValue
        : String(Math.max(1, Math.round((value * image.width) / image.height))),
    )
  }

  function changeUnit(nextUnit: ResizeUnit) {
    if (nextUnit === unit) {
      return
    }

    const currentWidth = calculation.error ? image.width : calculation.width
    const currentHeight = calculation.error ? image.height : calculation.height

    if (nextUnit === 'pixels') {
      setWidthValue(String(currentWidth))
      setHeightValue(String(currentHeight))
    } else {
      setWidthValue(formatPercent((currentWidth / image.width) * 100))
      setHeightValue(formatPercent((currentHeight / image.height) * 100))
    }

    setUnit(nextUnit)
    setProcessingError('')
  }

  function changeAspectRatioLock(checked: boolean) {
    setKeepAspectRatio(checked)

    if (!checked) {
      return
    }

    const width = Number(widthValue)

    if (!Number.isFinite(width) || width <= 0) {
      return
    }

    setHeightValue(
      unit === 'percent'
        ? widthValue
        : String(Math.max(1, Math.round((width * image.height) / image.width))),
    )
  }

  async function handleApply() {
    if (calculation.error || isApplying) {
      return
    }

    setIsApplying(true)
    setProcessingError('')
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    try {
      const pixels = resizeImageData(
        image.pixels,
        calculation.width,
        calculation.height,
        interpolation,
      )
      onApply(pixels)
    } catch (error) {
      setProcessingError(
        error instanceof Error ? error.message : 'Не удалось изменить размер изображения.',
      )
      setIsApplying(false)
    }
  }

  const visibleError = processingError || calculation.error

  return (
    <dialog
      className="resize-dialog"
      ref={dialogRef}
      aria-labelledby="resize-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!isApplying) onCancel()
      }}
    >
      <header className="resize-dialog-header">
        <span>
          <small>Геометрическое преобразование</small>
          <h2 id="resize-title">Размер изображения</h2>
        </span>
        <button
          className="dialog-icon-button"
          type="button"
          title="Закрыть"
          aria-label="Закрыть изменение размера"
          disabled={isApplying}
          onClick={onCancel}
        >
          <X size={18} />
        </button>
      </header>

      <div className="resize-dialog-content">
        <section className="pixel-count-comparison" aria-label="Количество пикселей">
          <div>
            <span>До изменения</span>
            <strong>{formatPixelCount(image.width * image.height)}</strong>
            <small>{image.width} × {image.height} px</small>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>После изменения</span>
            <strong>
              {calculation.error
                ? '—'
                : formatPixelCount(calculation.width * calculation.height)}
            </strong>
            <small>
              {calculation.error ? 'Некорректный размер' : `${calculation.width} × ${calculation.height} px`}
            </small>
          </div>
        </section>

        <label className="resize-unit-field" htmlFor="resize-unit">
          <span>Единицы измерения</span>
          <select
            id="resize-unit"
            value={unit}
            disabled={isApplying}
            onChange={(event) => changeUnit(event.currentTarget.value as ResizeUnit)}
          >
            <option value="percent">Проценты</option>
            <option value="pixels">Пиксели</option>
          </select>
        </label>

        <div className="resize-dimension-fields">
          <label>
            <span>Ширина, {unit === 'percent' ? '%' : 'px'}</span>
            <input
              type="number"
              min="1"
              max={unit === 'percent' ? 1000 : MAX_RESIZE_DIMENSION}
              step={unit === 'percent' ? 0.1 : 1}
              value={widthValue}
              disabled={isApplying}
              onChange={(event) => updateWidth(event.currentTarget.value)}
            />
          </label>
          <label>
            <span>Высота, {unit === 'percent' ? '%' : 'px'}</span>
            <input
              type="number"
              min="1"
              max={unit === 'percent' ? 1000 : MAX_RESIZE_DIMENSION}
              step={unit === 'percent' ? 0.1 : 1}
              value={heightValue}
              disabled={isApplying}
              onChange={(event) => updateHeight(event.currentTarget.value)}
            />
          </label>
        </div>

        <label className="aspect-ratio-toggle">
          <input
            type="checkbox"
            checked={keepAspectRatio}
            disabled={isApplying}
            onChange={(event) => changeAspectRatioLock(event.currentTarget.checked)}
          />
          {keepAspectRatio ? <Link size={16} /> : <Link2Off size={16} />}
          <span>Сохранять пропорции</span>
        </label>

        <div className="interpolation-row">
          <label htmlFor="resize-interpolation">
            <span>Интерполяция</span>
            <select
              id="resize-interpolation"
              value={interpolation}
              disabled={isApplying}
              onChange={(event) => {
                setInterpolation(event.currentTarget.value as InterpolationMethod)
              }}
            >
              {INTERPOLATION_OPTIONS.map((option) => (
                <option value={option.id} key={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <span className="interpolation-tooltip" tabIndex={0} aria-describedby="interpolation-tip">
            <CircleHelp size={16} aria-hidden="true" />
            <span id="interpolation-tip" role="tooltip">
              {selectedInterpolation.description}
            </span>
          </span>
        </div>

        {visibleError && <p className="resize-error" role="alert">{visibleError}</p>}
      </div>

      <footer className="resize-dialog-footer">
        <button type="button" disabled={isApplying} onClick={onCancel}>Отмена</button>
        <button
          className="resize-apply-button"
          type="button"
          disabled={Boolean(calculation.error) || isApplying}
          onClick={handleApply}
        >
          {isApplying && <LoaderCircle className="command-spinner" size={16} />}
          {isApplying ? 'Масштабирование...' : 'Изменить размер'}
        </button>
      </footer>
    </dialog>
  )
}

function calculateTargetSize(
  image: RasterDocument,
  unit: ResizeUnit,
  widthValue: string,
  heightValue: string,
): ResizeCalculation {
  const rawWidth = Number(widthValue)
  const rawHeight = Number(heightValue)

  if (!widthValue || !heightValue || !Number.isFinite(rawWidth) || !Number.isFinite(rawHeight)) {
    return invalidSize('Введите числовые значения ширины и высоты.')
  }

  if (rawWidth <= 0 || rawHeight <= 0) {
    return invalidSize('Ширина и высота должны быть больше нуля.')
  }

  if (
    unit === 'percent'
    && (rawWidth < 1 || rawHeight < 1 || rawWidth > 1000 || rawHeight > 1000)
  ) {
    return invalidSize('Допустимый диапазон масштабирования: от 1% до 1000%.')
  }

  if (unit === 'pixels' && (!Number.isInteger(rawWidth) || !Number.isInteger(rawHeight))) {
    return invalidSize('Размер в пикселях должен быть целым числом.')
  }

  const width = unit === 'percent'
    ? Math.max(1, Math.round((image.width * rawWidth) / 100))
    : rawWidth
  const height = unit === 'percent'
    ? Math.max(1, Math.round((image.height * rawHeight) / 100))
    : rawHeight

  if (width > MAX_RESIZE_DIMENSION || height > MAX_RESIZE_DIMENSION) {
    return invalidSize(`Максимальная сторона изображения: ${MAX_RESIZE_DIMENSION} px.`)
  }

  if (width * height > MAX_RESIZE_PIXELS) {
    return invalidSize('Результат не должен превышать 64 мегапикселя.')
  }

  return { width, height, error: '' }
}

function invalidSize(error: string): ResizeCalculation {
  return { width: 0, height: 0, error }
}

function formatPercent(value: number): string {
  return String(Math.round(value * 100) / 100)
}

function formatPixelCount(pixelCount: number): string {
  const megapixels = pixelCount / 1_000_000
  const fractionDigits = megapixels < 0.01 ? 3 : megapixels < 10 ? 2 : 1

  return `${megapixels.toLocaleString('ru-RU', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })} Мп`
}
