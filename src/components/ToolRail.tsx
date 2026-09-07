import { Grid3X3, Maximize2, MousePointer2, Pipette, SlidersHorizontal } from 'lucide-react'
import type { EditorTool } from '../domain/image'

const tools = [
  { id: 'pointer', action: null, label: 'Выбор', icon: MousePointer2 },
  { id: 'eyedropper', action: null, label: 'Пипетка', icon: Pipette },
  { id: null, action: 'levels', label: 'Уровни', icon: SlidersHorizontal },
  { id: null, action: 'resize', label: 'Изменить размер', icon: Maximize2 },
  { id: null, action: 'filter', label: 'Фильтры', icon: Grid3X3 },
] satisfies Array<{
  id: EditorTool | null
  action: 'levels' | 'resize' | 'filter' | null
  label: string
  icon: typeof MousePointer2
}>

type ToolRailProps = {
  activeTool: EditorTool
  hasImage: boolean
  isLevelsOpen: boolean
  isResizeOpen: boolean
  isFilterOpen: boolean
  onOpenLevels: () => void
  onOpenResize: () => void
  onOpenFilter: () => void
  onSelectTool: (tool: EditorTool) => void
}

export function ToolRail({
  activeTool,
  hasImage,
  isLevelsOpen,
  isResizeOpen,
  isFilterOpen,
  onOpenLevels,
  onOpenResize,
  onOpenFilter,
  onSelectTool,
}: ToolRailProps) {
  return (
    <aside className="tool-rail" aria-label="Инструменты">
      {tools.map(({ id, action, label, icon: Icon }) => {
        const hasOpenDialog = isLevelsOpen || isResizeOpen || isFilterOpen
        const isActive = action === 'levels'
          ? isLevelsOpen
          : action === 'resize'
            ? isResizeOpen
            : action === 'filter'
              ? isFilterOpen
              : !hasOpenDialog && id === activeTool
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
              } else if (action === 'resize') {
                onOpenResize()
              } else if (action === 'filter') {
                onOpenFilter()
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
