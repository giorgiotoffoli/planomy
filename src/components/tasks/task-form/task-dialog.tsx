'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
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
import { decryptString, encryptString } from '@/lib/crypto/e2ee'
import { addCalendarDays, localDateKey } from '@/lib/today'
import EventDialog from '@/components/events/event-dialog'
import type { EventFormInitialValues } from '@/components/events/event-form'
import {
  createTask,
  notifyTaskOrganizationChanged,
  notifyTasksChanged,
  updateTask,
} from '@/components/tasks/mutations'
import { getTaskTimeBlocks, removeGeneratedRecurringSessions, removeTaskTimeBlocks, removeTimeBlock, saveTimeBlock } from '@/components/agenda/actions'
import { getTaskOccurrenceEditor, updateTaskOccurrenceTimingWithScope, updateTaskOccurrenceWithScope } from '@/components/tasks/recurrence-actions'
import { RecurrenceScopeDialog } from '@/components/recurrence/recurrence-scope-dialog'
import type { RecurrenceScope } from '@/lib/recurrence-scope'
import { resolveLocalPlanTime } from '@/lib/task-form'
import { isCreatedTaskVisible, type TaskCreationView } from '@/lib/task-creation'
import { showTaskCreatedToast } from '../create-task/task-created-toast'
import { TaskForm, type TaskFormInitialValues, type TaskFormValues } from './task-form'
import type { TaskOccurrenceContext } from './task-occurrence-context'

function addLocalMinutes(date: string, time: string, minutes: number) {
  const [hours, mins] = time.split(':').map(Number)
  const total = hours * 60 + mins + Math.max(15, Math.round(minutes))
  const nextDate = addCalendarDays(date, Math.floor(total / (24 * 60)))
  const nextMinutes = total % (24 * 60)
  return {
    date: nextDate,
    time: `${String(Math.floor(nextMinutes / 60)).padStart(2, '0')}:${String(nextMinutes % 60).padStart(2, '0')}`,
  }
}

function taskDraftToEvent(values: TaskFormValues): EventFormInitialValues {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const plan = values.planTimes[0]
  const date = values.dueDate ?? plan?.date ?? values.repeatRule?.startDate
  const recurrenceRule = values.repeatRule
    ? { ...values.repeatRule, startDate: date ?? values.repeatRule.startDate, scheduledSessions: undefined }
    : null
  const shared = {
    title: values.title,
    description: values.notes,
    location: '',
    listId: values.listId,
    categoryId: values.categoryId,
    timeZone,
    recurrenceRule,
  }

  if (values.dueDate && !values.dueTime) {
    return {
      ...shared,
      allDay: true,
      startsOn: values.dueDate,
      endsOn: addCalendarDays(values.dueDate, 1),
    }
  }

  if (values.dueDate && values.dueTime) {
    return {
      ...shared,
      allDay: false,
      startsOn: values.dueDate,
      endsOn: values.dueDate,
      startsAt: values.dueTime,
      endsAt: '',
    }
  }

  if (plan) {
    const end = addLocalMinutes(plan.date, plan.startTime, plan.duration)
    return {
      ...shared,
      allDay: false,
      startsOn: plan.date,
      endsOn: end.date,
      startsAt: plan.startTime,
      endsAt: end.time,
    }
  }

  if (date) {
    return {
      ...shared,
      allDay: true,
      startsOn: date,
      endsOn: addCalendarDays(date, 1),
    }
  }

  return { ...shared, startsOn: localDateKey() }
}

type TaskDialogProps = {
  mode: 'create' | 'edit'
  task?: TaskWithList
  lists: List[]
  categories?: Category[]
  listId?: string | null
  categoryId?: string | null
  initialValues?: TaskFormInitialValues
  focusPlanTime?: boolean
  children?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSaved?: (task: TaskWithList) => void
  suppressSuccessToast?: boolean
  creationView?: TaskCreationView
  occurrence?: TaskOccurrenceContext
}

export function TaskDialog({
  mode,
  task,
  lists,
  categories = [],
  listId = null,
  categoryId = null,
  initialValues,
  focusPlanTime = false,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSaved,
  suppressSuccessToast = false,
  creationView,
  occurrence,
}: TaskDialogProps) {
  const { masterKey } = useE2EE()
  const [internalOpen, setInternalOpen] = useState(false)
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
  const [loadingTimeBlock, setLoadingTimeBlock] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const submitting = useRef(false)
  const createdTaskId = useRef<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [eventDraft, setEventDraft] = useState<EventFormInitialValues | null>(null)
  const [occurrenceInitialValues, setOccurrenceInitialValues] = useState<TaskFormInitialValues | undefined>()
  const [scopeAction, setScopeAction] = useState<'edit' | 'delete' | null>(null)
  const [pendingOccurrenceInput, setPendingOccurrenceInput] = useState<Parameters<typeof updateTaskOccurrenceWithScope>[2] | null>(null)
  const [pendingOccurrenceTiming, setPendingOccurrenceTiming] = useState<{
    sessionId: string
    sessionIndex: number
    startsAt: string
    endsAt: string | null
  } | null>(null)
  const [scopeSaving, setScopeSaving] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = controlledOpen ?? internalOpen

  function setOpen(nextOpen: boolean) {
    if (submitting.current) return
    setSaveError(null)
    createdTaskId.current = null
    if (nextOpen) setOccurrenceInitialValues(undefined)
    if (nextOpen && mode === 'edit') {
      setLoadingTimeBlock(true)
      setTimeBlocks([])
    }
    if (!isControlled) setInternalOpen(nextOpen)
    controlledOnOpenChange?.(nextOpen)
  }

  useEffect(() => {
    if (!open || mode !== 'edit' || !task) return
    if (task.recurrence_rule) return
    let cancelled = false
    getTaskTimeBlocks(task.id)
      .then((blocks) => {
        if (!cancelled) setTimeBlocks(blocks)
      })
      .catch((cause) => {
        if (!cancelled) toast.error(cause instanceof Error ? cause.message : 'Schedule could not be loaded.')
      })
      .finally(() => {
        if (!cancelled) setLoadingTimeBlock(false)
      })
    return () => { cancelled = true }
  }, [mode, open, task])

  useEffect(() => {
    if (!open || mode !== 'edit' || !task || !occurrence) {
      return
    }
    if (!masterKey) return
    let cancelled = false
    getTaskOccurrenceEditor(task.id, occurrence.occurrenceId)
      .then(async (savedOccurrence) => {
        const raw = savedOccurrence.override_data
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
          if (!cancelled) setOccurrenceInitialValues(undefined)
          return
        }
        const values = raw as Record<string, unknown>
        const title = typeof values.title === 'string'
          ? await decryptString(values.title, masterKey)
          : task.title
        const notes = typeof values.notes === 'string' && values.notes
          ? await decryptString(values.notes, masterKey)
          : ''
        if (!cancelled) {
          setOccurrenceInitialValues({
            title,
            notes,
            listId: typeof values.listId === 'string' ? values.listId : values.listId === null ? null : task.list_id,
            categoryId: typeof values.categoryId === 'string' ? values.categoryId : values.categoryId === null ? null : task.category_id ?? null,
            dueDate: typeof values.dueDate === 'string' ? values.dueDate : values.dueDate === null ? null : task.due_date,
            dueTime: typeof values.dueTime === 'string' ? values.dueTime : values.dueTime === null ? null : task.due_time,
          })
        }
      })
      .catch((cause) => {
        if (!cancelled) toast.error(cause instanceof Error ? cause.message : 'Occurrence could not be loaded.')
      })
    return () => { cancelled = true }
  }, [masterKey, occurrence, open, mode, task])

  async function submit(values: TaskFormValues) {
    if (submitting.current) return
    setSaveError(null)
    if (!masterKey) {
      setSaveError('Unlock your vault before saving a task.')
      return
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const repeatRule = values.repeatRule
      ? {
          ...values.repeatRule,
          scheduledSessions: values.planTimes.length
            ? values.planTimes.map((planTime, index) => ({
                id: planTime.templateId ?? `session-${index + 1}`,
                startTime: planTime.startTime,
                durationMinutes: planTime.duration,
                timeZone: planTime.timeZone ?? timeZone,
              }))
            : undefined,
        }
      : null

    let planTimes: Array<{ id?: string; startsAt: string; endsAt: string | null }>
    try {
      planTimes = values.planTimes.map((planTime) => {
        const resolved = resolveLocalPlanTime(
          planTime.date,
          planTime.startTime,
          planTime.duration,
          planTime.occurrence,
        )
        return { id: planTime.id, ...resolved }
      })
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Schedule is invalid.')
      return
    }

    submitting.current = true
    setSaving(true)
    let taskSaved = false
    let organizationChanged = false
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
        repeatRule,
      }
      if (occurrence && task && task.recurrence_rule) {
        setPendingOccurrenceInput(input)
        if (occurrence.sessionId && occurrence.sessionIndex !== null && occurrence.sessionIndex !== undefined) {
          const plan = values.planTimes[occurrence.sessionIndex]
          if (plan) {
            try {
              const timing = resolveLocalPlanTime(
                occurrence.occurrenceDate,
                plan.startTime,
                plan.duration,
                plan.occurrence,
              )
              setPendingOccurrenceTiming({
                sessionId: occurrence.sessionId,
                sessionIndex: occurrence.sessionIndex,
                startsAt: timing.startsAt,
                endsAt: timing.endsAt,
              })
            } catch {
              setPendingOccurrenceTiming(null)
            }
          }
        } else {
          setPendingOccurrenceTiming(null)
        }
        setScopeAction('edit')
        submitting.current = false
        setSaving(false)
        return
      }
      const visualChange = mode === 'edit' && task && values.listId !== task.list_id
        ? {
            taskId: task.id,
            listId: values.listId,
            phase: 'optimistic' as const,
          }
        : null
      organizationChanged = Boolean(
        mode === 'edit' &&
        task &&
        (values.listId !== task.list_id || values.categoryId !== (task.category_id ?? null)),
      )
      if (organizationChanged && task) {
        const nextCategory = values.categoryId
          ? categories.find((category) => category.id === values.categoryId)
          : null
        notifyTaskOrganizationChanged({
          taskId: task.id,
          listId: values.listId,
          categoryId: values.categoryId,
          category: nextCategory
            ? { id: nextCategory.id, list_id: nextCategory.list_id, color: nextCategory.color ?? null }
            : null,
        })
      }
      if (visualChange) notifyTasksChanged(visualChange)
      // A failed Schedule save must retry the existing task, not insert another.
      const savedTask = mode === 'create' && !createdTaskId.current
        ? await createTask(input)
        : await updateTask({ ...input, taskId: createdTaskId.current ?? task!.id })

      if (!savedTask) throw new Error('Task was not saved.')
      taskSaved = true
      if (mode === 'create') createdTaskId.current = savedTask.id

      try {
        if (!repeatRule) {
          const retainedIds = new Set(planTimes.map((planTime) => planTime.id).filter(Boolean))
          await Promise.all([
            ...planTimes.map((planTime) => saveTimeBlock(
              savedTask.id,
              planTime.startsAt,
              planTime.endsAt,
              planTime.id,
            )),
            ...(mode === 'edit'
              ? timeBlocks
                .filter((block) => block.id && !retainedIds.has(block.id))
                .map((block) => removeTimeBlock(block.id!))
              : []),
          ])
          if (mode === 'edit' && !planTimes.length && timeBlocks.some((block) => !block.id)) {
            await removeTaskTimeBlocks(savedTask.id)
          }
        } else {
          await removeGeneratedRecurringSessions(savedTask.id)
        }
      } catch (cause) {
        const detail = cause instanceof Error ? ` ${cause.message}` : ''
        throw new Error(`Task saved, but Schedule couldn't be saved. Try again to finish saving this task.${detail}`)
      }

      notifyTasksChanged()
      if (mode === 'create') {
        const localTask = {
          ...savedTask,
          title: values.title,
          notes: values.notes,
          list: lists.find((list) => list.id === savedTask.list_id) ?? null,
        }
        if (!suppressSuccessToast && !isCreatedTaskVisible(localTask, creationView)) {
          showTaskCreatedToast(localTask, lists, categories)
        }
      }
      submitting.current = false
      setOpen(false)
      onSaved?.(savedTask)
    } catch (cause) {
      if (organizationChanged && !taskSaved && task) {
        notifyTaskOrganizationChanged({
          taskId: task.id,
          listId: task.list_id,
          categoryId: task.category_id ?? null,
          category: task.category ?? null,
        })
      }
      if (
        mode === 'edit' &&
        task &&
        !taskSaved &&
        values.listId !== task.list_id
      ) {
        notifyTasksChanged({
          taskId: task.id,
          listId: task.list_id,
          phase: 'rollback',
        })
      }
      setSaveError(cause instanceof Error ? cause.message : 'Task could not be saved. Try again.')
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  function createEventFromDraft(values: TaskFormValues) {
    setEventDraft(taskDraftToEvent(values))
    setOpen(false)
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
      {loadingTimeBlock && !task?.recurrence_rule ? (
          <p role="status" className="py-8 text-sm text-muted-foreground">Loading Schedule…</p>
      ) : (
        <TaskForm
          key={`${open}-${task?.id ?? 'new'}-${occurrence?.occurrenceId ?? 'series'}-${occurrenceInitialValues?.title ?? 'base'}-${timeBlocks.map((block) => block.id ?? block.starts_at).join('|')}`}
          mode={mode}
          task={task}
          lists={lists}
          categories={categories}
          initialListId={listId}
          initialCategoryId={categoryId}
          initialValues={occurrenceInitialValues ?? initialValues}
          initialTimeBlocks={timeBlocks}
          focusPlanTime={focusPlanTime}
          disabled={saving}
          error={saveError}
          onCancel={() => setOpen(false)}
          onCreateEvent={mode === 'create' ? createEventFromDraft : undefined}
          onSubmit={submit}
        />
      )}
    </DialogContent>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {children && <DialogTrigger asChild>{children}</DialogTrigger>}
        {content}
      </Dialog>
      {eventDraft ? (
        <EventDialog
          lists={lists}
          categories={categories}
          initialValues={eventDraft}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setEventDraft(null)
          }}
        />
      ) : null}
      <RecurrenceScopeDialog
        open={scopeAction !== null}
        action="edit"
        itemLabel="task"
        availableScopes={pendingOccurrenceInput?.repeatRule ? undefined : ['this', 'all']}
        busy={scopeSaving}
        onCancel={() => {
          if (scopeSaving) return
          setScopeAction(null)
          setPendingOccurrenceInput(null)
          setPendingOccurrenceTiming(null)
        }}
        onConfirm={(scope: RecurrenceScope) => {
          if (!pendingOccurrenceInput || !task || !occurrence) return
          setScopeSaving(true)
          void updateTaskOccurrenceWithScope(task.id, occurrence.occurrenceId, pendingOccurrenceInput, scope)
            .then(async () => {
              if (scope === 'this' && pendingOccurrenceTiming) {
                await updateTaskOccurrenceTimingWithScope({
                  taskId: task.id,
                  occurrenceId: occurrence.occurrenceId,
                  sessionId: pendingOccurrenceTiming.sessionId,
                  sessionIndex: pendingOccurrenceTiming.sessionIndex,
                  startsAt: pendingOccurrenceTiming.startsAt,
                  endsAt: pendingOccurrenceTiming.endsAt,
                  scope,
                })
              }
            })
            .then(() => {
              notifyTasksChanged()
              setScopeAction(null)
              setPendingOccurrenceInput(null)
              setPendingOccurrenceTiming(null)
              setOpen(false)
              onSaved?.(task)
            })
            .catch((cause) => setSaveError(cause instanceof Error ? cause.message : 'Task occurrence could not be saved.'))
            .finally(() => setScopeSaving(false))
        }}
      />
    </>
  )
}
