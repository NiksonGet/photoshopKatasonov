import { Download, FolderOpen, Redo2, Undo2 } from 'lucide-react'

export function CommandBar() {
  return (
    <section className="command-bar" aria-label="Команды документа">
      <div className="command-group">
        <button className="primary-command" type="button" disabled>
          <FolderOpen size={17} />
          Открыть
        </button>
        <button className="icon-command" type="button" title="Отменить" aria-label="Отменить" disabled>
          <Undo2 size={17} />
        </button>
        <button className="icon-command" type="button" title="Повторить" aria-label="Повторить" disabled>
          <Redo2 size={17} />
        </button>
      </div>

      <span className="command-separator" aria-hidden="true" />

      <div className="command-group export-group">
        <label htmlFor="export-format">Формат</label>
        <select id="export-format" defaultValue="png" disabled>
          <option value="png">PNG</option>
          <option value="jpeg">JPG</option>
          <option value="gb7">GB7</option>
        </select>
        <button className="secondary-command" type="button" disabled>
          <Download size={17} />
          Экспорт
        </button>
      </div>
    </section>
  )
}

