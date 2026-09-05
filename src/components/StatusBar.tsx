export function StatusBar() {
  return (
    <footer className="status-bar">
      <span className="status-ready">
        <i aria-hidden="true" />
        Готово
      </span>
      <span className="status-document">Документ не открыт</span>
      <span className="status-scale">100%</span>
    </footer>
  )
}

