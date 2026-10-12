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
import type { ReactNode } from 'react'
import { GripVertical } from 'lucide-react'

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
  isExiting?: boolean
  categories?: Category[]
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
  isExiting = false,
  categories,
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
    id: task.id,
    disabled: { draggable: task.id.startsWith('temp-'), droppable: !canReorder },
    data: { kind: 'task', task, scope: dragScope, reorder: handleOnReorder },
  })

  const displayTask = isExiting ? { ...task, completed: true } : task
  const shouldAnimateExit =
    isExiting || (task.completed && shouldHideCompleted)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition
      ? `${transition}, opacity 300ms ease, background-color 200ms ease`
      : 'opacity 300ms ease, background-color 200ms ease',
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-xl hover:bg-slate-50',
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
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 px-3 py-3">
            {/* Checkbox */}
            <div className="flex h-6 items-center gap-2">
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
            <div className="min-w-0">
              {leadingBadge}
              <TaskTitle task={displayTask} handleOnRename={handleOnRename} />

              <TaskDetail
                task={displayTask}
                currentListId={currentListId}
                lists={lists}
                isInbox={isInbox}
                showDueDate={showDueDate}
                showAddToList={showAddToList}
              />
            </div>
            {/* Right side content */}
            <div className="flex items-center gap-3">
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
