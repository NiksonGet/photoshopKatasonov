import { CircleHelp } from 'lucide-react'

type EditorHeaderProps = {
  fileName?: string
}

export function EditorHeader({ fileName }: EditorHeaderProps) {
  return (
    <header className="editor-header">
      <div className="brand" aria-label="photoshopKatasonov">
        <span className="brand-name">photoshopKatasonov</span>
      </div>

      <nav className="menu-list" aria-label="Главное меню">
        <button type="button">Файл</button>
        <button type="button">
          Изображение
        </button>
        <button type="button">
          Коррекция
        </button>
        <button type="button">
          Фильтры
        </button>
      </nav>

      <div className="document-title">
        <span title={fileName}>{fileName ?? 'Новый документ'}</span>
        <small>{fileName ? 'открыт' : 'не сохранён'}</small>
      </div>

      <button className="header-icon-button" type="button" title="Справка" aria-label="Справка">
        <CircleHelp size={18} strokeWidth={1.8} />
      </button>
    </header>
  )
}
