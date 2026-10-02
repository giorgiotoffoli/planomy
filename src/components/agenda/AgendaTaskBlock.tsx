'use client'

import { useDraggable } from '@dnd-kit/core'
import { Clock, GripVertical } from 'lucide-react'
import { DialogTrigger } from '@/components/ui/dialog'
import { TaskEditDialog } from '@/components/tasks/task-item/task-edit/TaskEditDialog'
import { TaskCheckbox } from '@/components/tasks/task-item/TaskCheckbox'
import { renameTask, updateTaskCompleted, updateTaskDueDate, updateTaskNotes } from '@/components/tasks/mutations'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { encryptString } from '@/lib/crypto/e2ee'
import { MINUTE, PIXELS_PER_MINUTE, timeLabel } from '@/lib/agenda'
import type { AgendaBlock } from '@/types'
import { toast } from 'sonner'
import { useAgenda } from './AgendaProvider'

export default function AgendaTaskBlock({ item, dayStart }: { item: { block: AgendaBlock; start: number; end: number; column: number; columns: number }; dayStart: number }) {
  const { lists, edit, busy } = useAgenda()
  const { masterKey } = useE2EE()
  const { block } = item
  const { task } = block
  const { setNodeRef: setMoveRef, setActivatorNodeRef, attributes: moveAttributes, listeners: moveListeners, isDragging: isMoving } = useDraggable({ id: `agenda-block:${task.id}`, data: { kind: 'agenda-block', task, block }, disabled: busy.has(task.id) })
  const { setNodeRef: setResizeRef, attributes: resizeAttributes, listeners: resizeListeners, isDragging: isResizing } = useDraggable({ id: `agenda-resize:${task.id}`, data: { kind: 'agenda-resize', task, block }, disabled: busy.has(task.id) })
  const height = (item.end - item.start) / MINUTE * PIXELS_PER_MINUTE
  async function change(operation: () => Promise<unknown>) {
    try { await operation() } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Task was not saved.') }
  }
  const description = `${task.title} · ${task.list?.title ?? 'Inbox'} · ${timeLabel(Date.parse(block.starts_at))} – ${timeLabel(Date.parse(block.ends_at))}`
  return <div ref={setMoveRef} title={description} className={`pointer-events-auto absolute overflow-hidden rounded-md border border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100 ${task.completed ? 'opacity-55' : ''} ${isMoving || isResizing ? 'opacity-40' : ''}`} style={{ top: (item.start - dayStart) / MINUTE * PIXELS_PER_MINUTE, height, left: `${item.column / item.columns * 100}%`, width: `calc(${100 / item.columns}% - 3px)` }}>
    <div className="flex min-w-0 items-center gap-1 px-1 pt-0.5">
      <button ref={setActivatorNodeRef} {...moveAttributes} {...moveListeners} aria-label={`Move scheduled time for ${task.title}`} className="shrink-0 touch-none cursor-grab rounded focus-visible:ring-2"><GripVertical className="size-3" /></button>
      <TaskCheckbox task={task} handleOnComplete={(id, completed) => void change(() => updateTaskCompleted(id, completed))} />
      <TaskEditDialog task={task} lists={lists} currentListId={task.list_id}
        handleOnRename={(id, title) => void change(async () => { if (!masterKey) throw new Error('Unlock your vault first.'); await renameTask(id, await encryptString(title, masterKey)) })}
        handleOnNotesChange={(id, notes) => void change(async () => { if (!masterKey) throw new Error('Unlock your vault first.'); await updateTaskNotes(id, await encryptString(notes, masterKey)) })}
        handleOnDueDateChange={(id, date) => void change(() => updateTaskDueDate(id, date))}>
        <DialogTrigger asChild><button className={`min-w-0 flex-1 truncate text-left text-xs font-medium hover:underline ${task.completed ? 'line-through' : ''}`} aria-label={`Edit task: ${task.title}`}>{task.title}</button></DialogTrigger>
      </TaskEditDialog>
      <button className="shrink-0 rounded focus-visible:ring-2" aria-label={`Edit scheduled time for ${task.title}`} onClick={() => edit(task)}><Clock className="size-3.5" /></button>
    </div>
    {height >= 45 && <p className="truncate px-2 text-[10px] opacity-75">{timeLabel(Date.parse(block.starts_at))} · {task.list?.title ?? 'Inbox'}</p>}
    {height >= 70 && task.notes && <p className="line-clamp-2 px-2 text-xs opacity-75">{task.notes}</p>}
    <button ref={setResizeRef} {...resizeAttributes} {...resizeListeners} aria-label={`Resize scheduled time for ${task.title}`} className="absolute inset-x-1 bottom-0 h-1.5 touch-none cursor-ns-resize rounded bg-blue-400/30 focus-visible:h-2 focus-visible:ring-2" />
  </div>
}
