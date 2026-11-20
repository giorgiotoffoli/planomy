'use client'
import { Category, List, TaskWithList } from '../../../types'
import { TaskEditDropdown } from './task-edit/task-edit-dropdown'
import { Button } from '@/components/ui/button'
import { TaskCheckbox } from './task-checkbox'
import { TaskTitle } from './task-title'
import TaskDetail from './task-details'
import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import { GripVertical } from 'lucide-react'
import { inheritedColorStyle } from '@/lib/list-colors'

export const TASK_EXIT_ANIMATION_MS = 300

export function waitForTaskExit() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, TASK_EXIT_ANIMATION_MS)
  })
}

interface TaskItemProps {
  task: TaskWithList
  lists: List[]
  currentListId: string | null
  handleOnComplete: (taskId: string, isCompleted: boolean) => void
  handleOnRename: (taskId: string, newName: string) => void
  handleOnDueDateChange: (taskId: string, newDueDate: string) => void
  handleOnNotesChange: (taskId: string, notes: string) => void
  handleOnDelete: (taskId: string) => void
  shouldHideCompleted: boolean
  isInbox: boolean
  highlighted: boolean
  canReorder: boolean
  dragScope?: string
  handleOnReorder?: (activeId: string, overId: string) => void
  leadingBadge?: ReactNode
  trailingActions?: ReactNode
  handleOnFocus?: (taskId: string, focused: boolean) => void
  handleOnStash?: (taskId: string, stashed: boolean) => void
  showDueDate?: boolean
  showAddToList?: boolean
  compact?: boolean
  dense?: boolean
  homeWidgetStyle?: boolean
  wholeRowDraggable?: boolean
  dragId?: string
  dragDisabled?: boolean
  isExiting?: boolean
  categories?: Category[]
  showCategory?: boolean
  handleOnChangeCategory?: (
    taskId: string,
    categoryId: string | null,
  ) => Promise<void>
}

export function TaskItem({
  task,
  lists,
  highlighted,
  currentListId,
  handleOnComplete,
  handleOnRename,
  handleOnDueDateChange,
  handleOnNotesChange,
  handleOnDelete,
  shouldHideCompleted,
  isInbox,
  canReorder,
  dragScope,
  handleOnReorder,
  leadingBadge,
  trailingActions,
  handleOnFocus,
  handleOnStash,
  showDueDate = true,
  showAddToList = false,
  compact = false,
  dense = false,
  homeWidgetStyle = false,
  wholeRowDraggable = false,
  dragId,
  dragDisabled = false,
  isExiting = false,
  categories,
  showCategory = false,
  handleOnChangeCategory,
}: TaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dragId ?? task.id,
    disabled: {
      draggable:
        task.id.startsWith('temp-') ||
        dragDisabled ||
        (!canReorder && !wholeRowDraggable),
      droppable: !canReorder,
    },
    data: {
      kind: 'task',
      task,
      categoryId: task.category_id ?? null,
      scope: dragScope,
      reorder: handleOnReorder,
      changeCategory: handleOnChangeCategory,
    },
  })

  const displayTask = isExiting ? { ...task, completed: true } : task
  const shouldAnimateExit =
    isExiting || (task.completed && shouldHideCompleted)
  const currentListColor = task.list_id
    ? lists.find((list) => list.id === task.list_id)?.color ?? task.list?.color
    : null

  const style = {
    ...inheritedColorStyle(task.category?.color, currentListColor),
    transform: CSS.Transform.toString(transform),
    transition: transition
      ? `${transition}, opacity 300ms ease, background-color 200ms ease`
      : 'opacity 300ms ease, background-color 200ms ease',
  }
  const rowListeners = wholeRowDraggable
    ? {
        ...listeners,
        onPointerDown: (event: ReactPointerEvent<HTMLLIElement>) => {
          if (!isTaskActionTarget(event.target)) listeners?.onPointerDown?.(event)
        },
        onKeyDown: (event: ReactKeyboardEvent<HTMLLIElement>) => {
          if (!isTaskActionTarget(event.target)) listeners?.onKeyDown?.(event)
        },
      }
    : undefined

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...(wholeRowDraggable ? attributes : {})}
      {...(wholeRowDraggable ? rowListeners : {})}
      role={wholeRowDraggable ? 'listitem' : undefined}
      aria-label={wholeRowDraggable ? `Draggable task: ${task.title}` : undefined}
      aria-roledescription={wholeRowDraggable ? 'draggable task' : undefined}
      className={cn(
        'group border-b border-border/80 hover:bg-surface-hover',
        dense && 'border-b-0',
        wholeRowDraggable && 'cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        isDragging && 'cursor-grabbing opacity-50',
        highlighted && 'animate-pulse border-2 border-blue-400',
      )}
    >
      <div
        className={cn(
          'grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out',
          shouldAnimateExit
            ? 'pointer-events-none grid-rows-[0fr] opacity-0'
            : 'grid-rows-[1fr] opacity-100',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              'grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 px-3',
              homeWidgetStyle
                ? 'items-start gap-x-2 px-0 py-1.5'
                : dense
                  ? 'py-1.5'
                  : compact
                    ? 'py-2.5'
                    : 'py-3',
            )}
          >
            {/* Checkbox */}
            <div
              className={cn(
                'flex items-center gap-2',
                homeWidgetStyle ? 'h-7 pt-0.5' : 'h-6',
              )}
            >
              {canReorder && (
                <button
                  ref={setActivatorNodeRef}
                  {...attributes}
                  {...listeners}
                  aria-label={`Drag ${task.title} to reorder or schedule`}
                  className="touch-none cursor-grab rounded text-muted-foreground focus-visible:ring-2"
                >
                  <GripVertical className="size-3.5" />
                </button>
              )}
              <TaskCheckbox
                task={displayTask}
                handleOnComplete={handleOnComplete}
              />
            </div>
            {/* Content */}
            <div
              className={cn(
                'min-w-0',
                homeWidgetStyle && 'text-sm font-medium leading-tight [&>div]:text-xs [&>div]:font-normal',
              )}
            >
              {leadingBadge}
              <TaskTitle task={displayTask} handleOnRename={handleOnRename} />

              <TaskDetail
                task={displayTask}
                currentListId={currentListId}
                lists={lists}
                isInbox={isInbox}
                showDueDate={showDueDate}
                showAddToList={showAddToList}
                categories={categories}
                showCategory={showCategory}
              />
            </div>
            {/* Right side content */}
            <div
              className={cn(
                'flex items-center',
                homeWidgetStyle ? 'gap-1.5 pt-0.5' : 'gap-3',
              )}
            >
              {trailingActions}
              <TaskEditDropdown
                task={displayTask}
                lists={lists}
                currentListId={currentListId}
                handleOnDueDateChange={handleOnDueDateChange}
                handleOnNotesChange={handleOnNotesChange}
                handleOnDelete={handleOnDelete}
                handleOnRename={handleOnRename}
                handleOnFocus={handleOnFocus}
                handleOnStash={handleOnStash}
                categories={categories}
                handleOnChangeCategory={handleOnChangeCategory}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Actions for ${task.title}`}
                  className="h-7 w-7 shrink-0 cursor-pointer"
                >
                  ⋯
                </Button>
              </TaskEditDropdown>
            </div>{' '}
          </div>
        </div>
      </div>
    </li>
  )
}

function isTaskActionTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(
    target.closest('button, a, input, textarea, select, [role="button"], [role="menuitem"], [data-no-task-drag]'),
  )
}
