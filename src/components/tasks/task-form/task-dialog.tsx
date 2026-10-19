'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { Category, List, TaskWithList, TimeBlock } from '@/types'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { encryptString } from '@/lib/crypto/e2ee'
import {
  createTask,
  notifyTaskOrganizationChanged,
  notifyTasksChanged,
  updateTask,
} from '@/components/tasks/mutations'
import { getTaskTimeBlock, removeTimeBlock, saveTimeBlock } from '@/components/agenda/actions'
import { resolveLocalPlanTime } from '@/lib/task-form'
import { TaskForm, type TaskFormValues } from './task-form'

type TaskDialogProps = {
  mode: 'create' | 'edit'
  task?: TaskWithList
  lists: List[]
  categories?: Category[]
  listId?: string | null
  categoryId?: string | null
  focusPlanTime?: boolean
  children?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function resolvePlanTime(values: TaskFormValues) {
  if (!values.planTime) return null
  const { date, startTime, occurrence, duration } = values.planTime
  return resolveLocalPlanTime(date, startTime, duration, occurrence)
}

export function TaskDialog({
  mode,
  task,
  lists,
  categories = [],
  listId = null,
  categoryId = null,
  focusPlanTime = false,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: TaskDialogProps) {
  const { masterKey } = useE2EE()
  const [internalOpen, setInternalOpen] = useState(false)
  const [timeBlock, setTimeBlock] = useState<TimeBlock | null>(null)
  const [loadingTimeBlock, setLoadingTimeBlock] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = controlledOpen ?? internalOpen

  function setOpen(nextOpen: boolean) {
    if (nextOpen && mode === 'edit') {
      setLoadingTimeBlock(true)
      setTimeBlock(null)
    }
    if (!isControlled) setInternalOpen(nextOpen)
    controlledOnOpenChange?.(nextOpen)
  }

  useEffect(() => {
    if (!open || mode !== 'edit' || !task) return
    let cancelled = false
    getTaskTimeBlock(task.id)
      .then((block) => {
        if (!cancelled) setTimeBlock(block)
      })
      .catch((cause) => {
        if (!cancelled) toast.error(cause instanceof Error ? cause.message : 'Plan time could not be loaded.')
      })
      .finally(() => {
        if (!cancelled) setLoadingTimeBlock(false)
      })
    return () => { cancelled = true }
  }, [mode, open, task])

  async function submit(values: TaskFormValues) {
    if (!masterKey) {
      toast.error('Unlock your vault before saving a task.')
      return
    }

    let planTime: ReturnType<typeof resolvePlanTime>
    try {
      planTime = resolvePlanTime(values)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Plan time is invalid.')
      return
    }

    setSaving(true)
    const organizationChanged =
      mode === 'edit' &&
      task &&
      (values.listId !== task.list_id ||
        values.categoryId !== (task.category_id ?? null))

    if (organizationChanged) {
      notifyTaskOrganizationChanged({
        taskId: task.id,
        listId: values.listId,
        categoryId: values.categoryId,
      })
    }

    try {
      const encryptedTitle = await encryptString(values.title, masterKey)
      const encryptedNotes = values.notes ? await encryptString(values.notes, masterKey) : ''
      const input = {
        title: encryptedTitle,
        notes: encryptedNotes,
        listId: values.listId,
        categoryId: values.categoryId,
        dueDate: values.dueDate,
        dueTime: values.dueTime,
        focused: values.focused,
      }
      const savedTask = mode === 'create'
        ? await createTask(input)
        : await updateTask({ ...input, taskId: task!.id })

      if (!savedTask) throw new Error('Task was not saved.')

      if (planTime) {
        try {
          await saveTimeBlock(savedTask.id, planTime.startsAt, planTime.endsAt)
        } catch (cause) {
          const detail = cause instanceof Error ? ` ${cause.message}` : ''
          toast.error(`Task created, but Plan time couldn't be saved.${detail}`)
        }
      } else if (mode === 'edit') {
        try {
          await removeTimeBlock(savedTask.id)
        } catch (cause) {
          const detail = cause instanceof Error ? ` ${cause.message}` : ''
          toast.error(`Task saved, but Plan time couldn't be removed.${detail}`)
        }
      }

      notifyTasksChanged()
      setOpen(false)
    } catch (cause) {
      if (organizationChanged) {
        notifyTaskOrganizationChanged({
          taskId: task.id,
          listId: task.list_id,
          categoryId: task.category_id ?? null,
        })
      }
      toast.error(cause instanceof Error ? cause.message : 'Task could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const content = (
    <DialogContent className="flex max-h-[min(90dvh,48rem)] flex-col overflow-hidden p-5 sm:max-w-2xl sm:p-7">
      <DialogHeader className="mb-1 shrink-0 pr-8">
        <DialogTitle className="font-heading text-2xl tracking-tight">
          {mode === 'create' ? 'Add task' : 'Edit task'}
        </DialogTitle>
        <DialogDescription>
          {mode === 'create' ? 'Capture it now. Add the rest only if it helps.' : 'Keep the task, its home, and its plan together.'}
        </DialogDescription>
      </DialogHeader>
      {loadingTimeBlock ? (
          <p role="status" className="py-8 text-sm text-muted-foreground">Loading Plan time…</p>
      ) : (
        <TaskForm
          key={`${open}-${task?.id ?? 'new'}-${timeBlock?.starts_at ?? 'none'}`}
          mode={mode}
          task={task}
          lists={lists}
          categories={categories}
          initialListId={listId}
          initialCategoryId={categoryId}
          initialTimeBlock={timeBlock}
          focusPlanTime={focusPlanTime}
          disabled={saving}
          onCancel={() => setOpen(false)}
          onSubmit={submit}
        />
      )}
    </DialogContent>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      {content}
    </Dialog>
  )
}
