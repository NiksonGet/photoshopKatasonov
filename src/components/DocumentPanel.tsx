const emptyDetails = [
  ['Имя', '—'],
  ['Размер', '— × —'],
  ['Формат', '—'],
  ['Глубина', '—'],
]

export function DocumentPanel() {
  return (
    <aside className="document-panel" aria-label="Свойства документа">
      <section className="inspector-section">
        <div className="section-heading">
          <h2>Документ</h2>
          <span>Исходные данные</span>
        </div>

        <dl className="document-details">
          {emptyDetails.map(([term, value]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="inspector-section history-section">
        <div className="section-heading">
          <h2>История</h2>
          <span>0 действий</span>
        </div>
        <p className="empty-history">История изменений пуста</p>
      </section>
    </aside>
  )
}

