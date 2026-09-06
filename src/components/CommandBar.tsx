import { Download, FolderOpen, LoaderCircle, Redo2, Undo2 } from 'lucide-react'
import type { ExportImageFormat } from '../domain/image'

type CommandBarProps = {
  exportFormat: ExportImageFormat
  hasImage: boolean
  isExporting: boolean
  isLoading: boolean
  onFileSelect: (file: File) => void
  onExportFormatChange: (format: ExportImageFormat) => void
  onExport: () => void
}

export function CommandBar({
  exportFormat,
  hasImage,
  isExporting,
  isLoading,
  onFileSelect,
  onExportFormatChange,
  onExport,
}: CommandBarProps) {
  const isBusy = isLoading || isExporting

  return (
    <section className="command-bar" aria-label="Команды документа">
      <div className="command-group">
        <label
          className={`primary-command file-command ${isBusy ? 'control-disabled' : ''}`}
          htmlFor="image-file"
        >
          <FolderOpen size={17} />
          {isLoading ? 'Открытие...' : 'Открыть'}
          <input
            className="file-input-hidden"
            id="image-file"
            type="file"
            accept=".png,.jpg,.jpeg,.gb7,image/png,image/jpeg"
            disabled={isBusy}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]

              if (file) {
                onFileSelect(file)
              }

              event.currentTarget.value = ''
            }}
          />
        </label>
        <button
          className="icon-command"
          type="button"
          title="Отменить"
          aria-label="Отменить"
          disabled
        >
          <Undo2 size={17} />
        </button>
        <button
          className="icon-command"
          type="button"
          title="Повторить"
          aria-label="Повторить"
          disabled
        >
          <Redo2 size={17} />
        </button>
      </div>

      <span className="command-separator" aria-hidden="true" />

      <div className="command-group export-group">
        <label htmlFor="export-format">Формат</label>
        <select
          id="export-format"
          value={exportFormat}
          disabled={!hasImage || isBusy}
          onChange={(event) => {
            onExportFormatChange(event.currentTarget.value as ExportImageFormat)
          }}
        >
          <option value="png">PNG</option>
          <option value="jpeg">JPG</option>
          <option value="gb7">GB7</option>
        </select>
        <button
          className="secondary-command"
          type="button"
          disabled={!hasImage || isBusy}
          onClick={onExport}
        >
          {isExporting ? (
            <LoaderCircle className="command-spinner" size={17} />
          ) : (
            <Download size={17} />
          )}
          {isExporting ? 'Сохранение...' : 'Экспорт'}
        </button>
      </div>
    </section>
  )
}
