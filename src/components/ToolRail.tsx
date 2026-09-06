import { Grid3X3, Maximize2, MousePointer2, Pipette, SlidersHorizontal } from 'lucide-react'
import type { EditorTool } from '../domain/image'

const tools = [
  { id: 'pointer', action: null, label: 'Выбор', icon: MousePointer2 },
  { id: 'eyedropper', action: null, label: 'Пипетка', icon: Pipette },
  { id: null, action: 'levels', label: 'Уровни', icon: SlidersHorizontal },
  { id: null, action: null, label: 'Изменить размер', icon: Maximize2 },
  { id: null, action: null, label: 'Фильтры', icon: Grid3X3 },
] satisfies Array<{
  id: EditorTool | null
  action: 'levels' | null
  label: string
  icon: typeof MousePointer2
}>

type ToolRailProps = {
  activeTool: EditorTool
  hasImage: boolean
  isLevelsOpen: boolean
  onOpenLevels: () => void
  onSelectTool: (tool: EditorTool) => void
}

export function ToolRail({
  activeTool,
  hasImage,
  isLevelsOpen,
  onOpenLevels,
  onSelectTool,
}: ToolRailProps) {
  return (
    <aside className="tool-rail" aria-label="Инструменты">
      {tools.map(({ id, action, label, icon: Icon }) => {
        const isActive = action === 'levels'
          ? isLevelsOpen
          : !isLevelsOpen && id === activeTool
        const isDisabled = action === null
          ? id === null || (id === 'eyedropper' && !hasImage)
          : !hasImage

        return (
          <button
            className={isActive ? 'tool-button tool-button-active' : 'tool-button'}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={id || action ? isActive : undefined}
            disabled={isDisabled}
            key={label}
            onClick={() => {
              if (id) {
                onSelectTool(id)
              } else if (action === 'levels') {
                onOpenLevels()
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
