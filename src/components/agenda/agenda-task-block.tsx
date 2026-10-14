'use client'

import { useDraggable } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { TaskEditDialog } from '@/components/tasks/task-item/task-edit/task-edit-dialog'
import { TaskCheckbox } from '@/components/tasks/task-item/task-checkbox'
import { updateTaskCompleted } from '@/components/tasks/mutations'
import { MINUTE, PIXELS_PER_MINUTE, SLOT_MINUTES, timeLabel } from '@/lib/agenda'
import { listColorStyle } from '@/lib/list-colors'
import type { AgendaBlock } from '@/types'
import { toast } from 'sonner'
import { useAgenda } from './agenda-provider'

export default function AgendaTaskBlock({ item, dayStart }: { item: { block: AgendaBlock; start: number; end: number; column: number; columns: number }; dayStart: number }) {
  const { lists, categories, busy } = useAgenda()
  const { block } = item
  const { task } = block
  const { setNodeRef: setMoveRef, setActivatorNodeRef, attributes: moveAttributes, listeners: moveListeners, isDragging: isMoving } = useDraggable({ id: `agenda-block:${task.id}`, data: { kind: 'agenda-block', task, block }, disabled: busy.has(task.id) })
  const { setNodeRef: setResizeRef, attributes: resizeAttributes, listeners: resizeListeners, isDragging: isResizing } = useDraggable({ id: `agenda-resize:${task.id}`, data: { kind: 'agenda-resize', task, block }, disabled: busy.has(task.id) })
  const height = (item.end - item.start) / MINUTE * PIXELS_PER_MINUTE
  async function change(operation: () => Promise<unknown>) {
    try { await operation() } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Task was not saved.') }
  }
  const start = Date.parse(block.starts_at)
  const end = block.ends_at ? Date.parse(block.ends_at) : start + SLOT_MINUTES * MINUTE
  const description = `${task.title} · ${task.list?.title ?? 'Unsorted'} · ${timeLabel(start)} – ${timeLabel(end)}`
  return <div ref={setMoveRef} title={description} className={`planomy-scheduled-event agenda-task-block pointer-events-auto absolute overflow-hidden ${task.completed ? 'opacity-55' : ''} ${isMoving || isResizing ? 'opacity-40' : ''}`} style={{ ...listColorStyle(task.list?.color), top: (item.start - dayStart) / MINUTE * PIXELS_PER_MINUTE, height, left: `${item.column / item.columns * 100}%`, width: `calc(${100 / item.columns}% - 3px)` }}>
    <div className="flex min-w-0 items-center gap-1 px-1.5 pt-1">
      <button ref={setActivatorNodeRef} {...moveAttributes} {...moveListeners} aria-label={`Move scheduled time for ${task.title}`} className="shrink-0 touch-none cursor-grab rounded focus-visible:ring-2"><GripVertical className="size-3" /></button>
      <TaskCheckbox task={task} handleOnComplete={(id, completed) => void change(() => updateTaskCompleted(id, completed))} />
      <TaskEditDialog task={task} lists={lists} categories={categories} currentListId={task.list_id}>
        <button className={`min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline ${task.completed ? 'line-through' : ''}`} aria-label={`Edit task: ${task.title}`}>{task.title}</button>
      </TaskEditDialog>
    </div>
    {height >= 45 && <p className="truncate px-2.5 text-xs text-text-secondary">{timeLabel(Date.parse(block.starts_at))} · {task.list?.title ?? 'Unsorted'}</p>}
    {height >= 70 && task.notes && <p className="line-clamp-2 px-2.5 text-xs text-text-secondary">{task.notes}</p>}
    <button ref={setResizeRef} {...resizeAttributes} {...resizeListeners} aria-label={`Resize scheduled time for ${task.title}`} className="agenda-task-resize-handle absolute inset-x-1 bottom-0 h-1.5 touch-none cursor-ns-resize rounded focus-visible:h-2 focus-visible:ring-2" />
  </div>
}
