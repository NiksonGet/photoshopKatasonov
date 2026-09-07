import { LoaderCircle, RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ImageChannel, RasterDocument } from '../domain/image'
import type { ChannelDefinition } from '../image/channelProcessing'
import {
  applyKernelFilter,
  EDGE_HANDLING_OPTIONS,
  isIdentityKernel,
  isKernelAbortError,
  KERNEL_PRESETS,
  type EdgeHandling,
  type KernelFilterSettings,
  type KernelPresetId,
} from '../image/kernelFiltering'

type KernelFilterDialogProps = {
  image: RasterDocument
  channels: ChannelDefinition[]
  onPreview: (pixels: ImageData | null) => void
  onApply: (pixels: ImageData) => void
  onCancel: () => void
}

type ProcessingMode = 'idle' | 'preview' | 'apply'
type SelectedPreset = KernelPresetId | 'custom'

const DEFAULT_PRESET = KERNEL_PRESETS[0]

export function KernelFilterDialog({
  image,
  channels,
  onPreview,
  onApply,
  onCancel,
}: KernelFilterDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const allChannelsRef = useRef<HTMLInputElement>(null)
  const previewControllerRef = useRef<AbortController | null>(null)
  const applyControllerRef = useRef<AbortController | null>(null)
  const previewCacheRef = useRef<{
    signature: string
    pixels: ImageData
  } | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<SelectedPreset>(
    DEFAULT_PRESET.id,
  )
  const [kernelInputs, setKernelInputs] = useState<string[]>(() => (
    formatKernelValues(DEFAULT_PRESET.values)
  ))
  const [selectedChannels, setSelectedChannels] = useState<ImageChannel[]>(() => (
    channels.map(({ id }) => id)
  ))
  const [edgeHandling, setEdgeHandling] = useState<EdgeHandling>('copy')
  const [previewEnabled, setPreviewEnabled] = useState(true)
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('idle')
  const [progress, setProgress] = useState(0)
  const [processingError, setProcessingError] = useState('')
  const parsedKernel = useMemo(
    () => parseKernel(kernelInputs),
    [kernelInputs],
  )
  const validationError = getValidationError(parsedKernel, selectedChannels)
  const settings = useMemo<KernelFilterSettings | null>(() => {
    if (!parsedKernel || validationError) {
      return null
    }

    return {
      kernel: parsedKernel,
      channels: selectedChannels,
      edgeHandling,
    }
  }, [edgeHandling, parsedKernel, selectedChannels, validationError])
  const settingsSignature = settings ? createSettingsSignature(settings) : ''
  const allChannelsSelected = channels.every(({ id }) => (
    selectedChannels.includes(id)
  ))
  const someChannelsSelected = channels.some(({ id }) => (
    selectedChannels.includes(id)
  ))
  const isApplying = processingMode === 'apply'

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    dialog.showModal()

    return () => {
      previewControllerRef.current?.abort()
      applyControllerRef.current?.abort()

      if (dialog.open) {
        dialog.close()
      }
    }
  }, [])

  useEffect(() => {
    if (allChannelsRef.current) {
      allChannelsRef.current.indeterminate = (
        someChannelsSelected && !allChannelsSelected
      )
    }
  }, [allChannelsSelected, someChannelsSelected])

  useEffect(() => {
    previewControllerRef.current?.abort()

    if (!previewEnabled || !settings) {
      setProcessingMode((current) => current === 'apply' ? current : 'idle')
      setProgress(0)
      onPreview(null)
      return
    }

    if (isIdentityKernel(settings.kernel)) {
      previewCacheRef.current = null
      setProcessingMode((current) => current === 'apply' ? current : 'idle')
      setProgress(0)
      onPreview(null)
      return
    }

    const timeoutId = window.setTimeout(() => {
      const controller = new AbortController()

      previewControllerRef.current = controller
      setProcessingMode('preview')
      setProgress(0)
      setProcessingError('')

      applyKernelFilter(image.pixels, settings, {
        signal: controller.signal,
        onProgress: ({ phase, value }) => {
          if (previewControllerRef.current === controller) {
            setProgress(getTotalProgress(phase, value))
          }
        },
      })
        .then((pixels) => {
          if (previewControllerRef.current !== controller) {
            return
          }

          previewCacheRef.current = { signature: settingsSignature, pixels }
          onPreview(pixels)
        })
        .catch((error: unknown) => {
          if (!isKernelAbortError(error)) {
            setProcessingError('Не удалось построить предпросмотр фильтра.')
            onPreview(null)
          }
        })
        .finally(() => {
          if (previewControllerRef.current === controller) {
            previewControllerRef.current = null
            setProcessingMode('idle')
            setProgress(0)
          }
        })
    }, 140)

    return () => {
      window.clearTimeout(timeoutId)
      previewControllerRef.current?.abort()
    }
  }, [image, onPreview, previewEnabled, settings, settingsSignature])

  function handleClose() {
    previewControllerRef.current?.abort()
    applyControllerRef.current?.abort()
    onPreview(null)
    onCancel()
  }

  function handleReset() {
    previewControllerRef.current?.abort()
    applyControllerRef.current?.abort()
    previewControllerRef.current = null
    applyControllerRef.current = null
    previewCacheRef.current = null
    setSelectedPreset(DEFAULT_PRESET.id)
    setKernelInputs(formatKernelValues(DEFAULT_PRESET.values))
    setSelectedChannels(channels.map(({ id }) => id))
    setEdgeHandling('copy')
    setPreviewEnabled(true)
    setProcessingMode('idle')
    setProgress(0)
    setProcessingError('')
    onPreview(null)
  }

  function handlePresetChange(presetId: SelectedPreset) {
    const preset = KERNEL_PRESETS.find(({ id }) => id === presetId)

    setSelectedPreset(presetId)
    setProcessingError('')

    if (preset) {
      setKernelInputs(formatKernelValues(preset.values))
    }
  }

  function handleKernelChange(index: number, value: string) {
    setSelectedPreset('custom')
    setKernelInputs((current) => current.map((coefficient, position) => (
      position === index ? value : coefficient
    )))
    setProcessingError('')
  }

  function toggleChannel(channel: ImageChannel) {
    setSelectedChannels((current) => (
      current.includes(channel)
        ? current.filter((selected) => selected !== channel)
        : channels
            .map(({ id }) => id)
            .filter((available) => current.includes(available) || available === channel)
    ))
    setProcessingError('')
  }

  function toggleAllChannels() {
    setSelectedChannels(
      allChannelsSelected ? [] : channels.map(({ id }) => id),
    )
    setProcessingError('')
  }

  async function handleApply() {
    if (!settings || isApplying) {
      return
    }

    previewControllerRef.current?.abort()
    previewControllerRef.current = null
    setProcessingError('')

    const cachedPreview = previewCacheRef.current

    if (cachedPreview?.signature === settingsSignature) {
      onPreview(null)
      onApply(cachedPreview.pixels)
      return
    }

    const controller = new AbortController()

    applyControllerRef.current = controller
    setProcessingMode('apply')
    setProgress(0)

    try {
      const pixels = await applyKernelFilter(image.pixels, settings, {
        signal: controller.signal,
        onProgress: ({ phase, value }) => {
          if (applyControllerRef.current === controller) {
            setProgress(getTotalProgress(phase, value))
          }
        },
      })

      if (applyControllerRef.current === controller) {
        onPreview(null)
        onApply(pixels)
      }
    } catch (error) {
      if (!isKernelAbortError(error)) {
        setProcessingError('Не удалось применить фильтр к изображению.')
      }
    } finally {
      if (applyControllerRef.current === controller) {
        applyControllerRef.current = null
        setProcessingMode('idle')
        setProgress(0)
      }
    }
  }

  const visibleError = processingError || validationError

  return (
    <dialog
      className="filter-dialog"
      ref={dialogRef}
      aria-labelledby="filter-title"
      onCancel={(event) => {
        event.preventDefault()
        handleClose()
      }}
    >
      <header className="filter-dialog-header">
        <span>
          <small>Свёртка изображения</small>
          <h2 id="filter-title">Фильтрация</h2>
        </span>
        <button
          className="dialog-icon-button"
          type="button"
          title="Закрыть"
          aria-label="Закрыть фильтрацию"
          onClick={handleClose}
        >
          <X size={18} />
        </button>
      </header>

      <div className="filter-dialog-content">
        <div className="filter-selectors">
          <label htmlFor="kernel-preset">
            <span>Предустановка</span>
            <select
              id="kernel-preset"
              value={selectedPreset}
              disabled={isApplying}
              onChange={(event) => {
                handlePresetChange(event.currentTarget.value as SelectedPreset)
              }}
            >
              {KERNEL_PRESETS.map((preset) => (
                <option value={preset.id} key={preset.id}>{preset.label}</option>
              ))}
              {selectedPreset === 'custom' && (
                <option value="custom">Пользовательское ядро</option>
              )}
            </select>
          </label>

          <label htmlFor="edge-handling">
            <span>Обработка края</span>
            <select
              id="edge-handling"
              value={edgeHandling}
              disabled={isApplying}
              onChange={(event) => {
                setEdgeHandling(event.currentTarget.value as EdgeHandling)
                setProcessingError('')
              }}
            >
              {EDGE_HANDLING_OPTIONS.map((option) => (
                <option value={option.id} key={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <section className="kernel-editor" aria-labelledby="kernel-title">
          <div className="filter-section-heading">
            <h3 id="kernel-title">Ядро</h3>
            <span>3 × 3</span>
          </div>
          <div className="kernel-input-grid">
            {kernelInputs.map((value, index) => (
              <input
                type="number"
                step="0.001"
                value={value}
                disabled={isApplying}
                aria-label={`Коэффициент ядра ${index + 1}`}
                key={index}
                onChange={(event) => {
                  handleKernelChange(index, event.currentTarget.value)
                }}
              />
            ))}
          </div>
        </section>

        <section className="filter-channels" aria-labelledby="filter-channels-title">
          <div className="filter-section-heading">
            <h3 id="filter-channels-title">Каналы</h3>
            <span>{selectedChannels.length} из {channels.length}</span>
          </div>
          <div className="filter-channel-grid">
            <label className="filter-channel-option filter-channel-all">
              <input
                ref={allChannelsRef}
                type="checkbox"
                checked={allChannelsSelected}
                disabled={isApplying}
                onChange={toggleAllChannels}
              />
              <span>Все</span>
            </label>
            {channels.map((channel) => (
              <label className="filter-channel-option" key={channel.id}>
                <input
                  type="checkbox"
                  checked={selectedChannels.includes(channel.id)}
                  disabled={isApplying}
                  onChange={() => toggleChannel(channel.id)}
                />
                <i className={`filter-channel-mark filter-channel-${channel.id}`} aria-hidden="true" />
                <span>{channel.shortLabel}</span>
              </label>
            ))}
          </div>
        </section>

        {(processingMode !== 'idle') && (
          <div className="filter-progress" role="status" aria-live="polite">
            <span>
              <LoaderCircle className="command-spinner" size={15} />
              {isApplying ? 'Применение' : 'Предпросмотр'}
            </span>
            <strong>{Math.round(progress * 100)}%</strong>
            <i style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}

        {visibleError && (
          <p className="filter-error" role="alert">{visibleError}</p>
        )}
      </div>

      <footer className="filter-dialog-footer">
        <label className="preview-toggle">
          <input
            type="checkbox"
            checked={previewEnabled}
            disabled={isApplying}
            onChange={(event) => setPreviewEnabled(event.currentTarget.checked)}
          />
          <span>Предпросмотр</span>
        </label>

        <div className="filter-actions">
          <button type="button" onClick={handleClose}>Закрыть</button>
          <button className="reset-button" type="button" onClick={handleReset}>
            <RotateCcw size={15} />
            Сбросить
          </button>
          <button
            className="apply-filter-button"
            type="button"
            disabled={!settings || isApplying}
            onClick={handleApply}
          >
            {isApplying && <LoaderCircle className="command-spinner" size={15} />}
            Применить
          </button>
        </div>
      </footer>
    </dialog>
  )
}

function formatKernelValues(values: readonly number[]): string[] {
  return values.map((value) => String(Number(value.toFixed(6))))
}

function parseKernel(inputs: readonly string[]): number[] | null {
  if (inputs.length !== 9 || inputs.some((value) => value.trim() === '')) {
    return null
  }

  const kernel = inputs.map(Number)

  if (kernel.some((value) => !Number.isFinite(value) || Math.abs(value) > 1000)) {
    return null
  }

  return kernel
}

function getValidationError(
  kernel: readonly number[] | null,
  selectedChannels: readonly ImageChannel[],
): string {
  if (!kernel) {
    return 'Введите девять коэффициентов от −1000 до 1000.'
  }

  if (selectedChannels.length === 0) {
    return 'Выберите хотя бы один канал.'
  }

  return ''
}

function createSettingsSignature(settings: KernelFilterSettings): string {
  return [
    settings.edgeHandling,
    settings.channels.join(','),
    settings.kernel.join(','),
  ].join('|')
}

function getTotalProgress(
  phase: 'padding' | 'convolution',
  progress: number,
): number {
  return phase === 'padding' ? progress * 0.08 : 0.08 + progress * 0.92
}
