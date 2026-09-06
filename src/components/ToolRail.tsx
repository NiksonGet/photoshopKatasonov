import { Grid3X3, Maximize2, MousePointer2, Pipette, SlidersHorizontal } from 'lucide-react'
import type { EditorTool } from '../domain/image'

const tools = [
  { id: 'pointer', label: 'Выбор', icon: MousePointer2 },
  { id: 'eyedropper', label: 'Пипетка', icon: Pipette },
  { id: null, label: 'Уровни', icon: SlidersHorizontal },
  { id: null, label: 'Изменить размер', icon: Maximize2 },
  { id: null, label: 'Фильтры', icon: Grid3X3 },
] satisfies Array<{
  id: EditorTool | null
  label: string
  icon: typeof MousePointer2
}>

type ToolRailProps = {
  activeTool: EditorTool
  hasImage: boolean
  onSelectTool: (tool: EditorTool) => void
}

export function ToolRail({
  activeTool,
  hasImage,
  onSelectTool,
}: ToolRailProps) {
  return (
    <aside className="tool-rail" aria-label="Инструменты">
      {tools.map(({ id, label, icon: Icon }) => {
        const isActive = id === activeTool
        const isDisabled = id === null || (id === 'eyedropper' && !hasImage)

        return (
          <button
            className={isActive ? 'tool-button tool-button-active' : 'tool-button'}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={id ? isActive : undefined}
            disabled={isDisabled}
            key={label}
            onClick={() => {
              if (id) {
                onSelectTool(id)
              }
            }}
          >
            <Icon size={19} strokeWidth={1.8} />
          </button>
        )
      })}
    </aside>
  )
}
