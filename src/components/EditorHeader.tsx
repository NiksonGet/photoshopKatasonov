type EditorHeaderProps = {
  fileName?: string
}

export function EditorHeader({ fileName }: EditorHeaderProps) {
  return (
    <header className="editor-header">
      <div className="brand" aria-label="photoshopKatasonov">
        <span className="brand-name">photoshopKatasonov</span>
      </div>

      <div className="document-title">
        <span title={fileName}>{fileName ?? 'Новый документ'}</span>
        <small>{fileName ? 'открыт' : 'не сохранён'}</small>
      </div>
    </header>
  )
}
