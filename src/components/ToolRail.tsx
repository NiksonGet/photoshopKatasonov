import { Grid3X3, Maximize2, MousePointer2, Pipette, SlidersHorizontal } from 'lucide-react'

const tools = [
  { label: 'Выбор', icon: MousePointer2, active: true },
  { label: 'Пипетка', icon: Pipette },
  { label: 'Уровни', icon: SlidersHorizontal },
  { label: 'Изменить размер', icon: Maximize2 },
  { label: 'Фильтры', icon: Grid3X3 },
]

export function ToolRail() {
  return (
    <aside className="tool-rail" aria-label="Инструменты">
      {tools.map(({ label, icon: Icon, active }) => (
        <button
          className={active ? 'tool-button tool-button-active' : 'tool-button'}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={active}
          disabled={!active}
          key={label}
        >
          <Icon size={19} strokeWidth={1.8} />
        </button>
      ))}
    </aside>
  )
}

