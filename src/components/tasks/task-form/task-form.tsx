'use client'

import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  FolderOpen,
  ListX,
  NotebookPen,
  Repeat,
  Star,
  Tag,
  Trash2,
  Type,
} from 'lucide-react'
import type { Category, List, RecurrenceRule, TaskWithList, TimeBlock } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ListEmoji } from '@/components/lists/list-emoji'
import { localDateKey } from '@/lib/today'
import { cn } from '@/lib/utils'
import { localTimeCandidates, MINUTE, SLOT_MINUTES, timeInput, timeLabel } from '@/lib/agenda'
import { formatTime, type TimeFormat } from '@/lib/calendar-preferences'
import { useCalendarPreferences } from '@/components/settings/calendar-preferences-provider'
import { recurrenceLabel } from '@/lib/recurrence'

export type PlanTimeDraft = {
  id?: string
  templateId?: string
  timeZone?: string
  date: string
  startTime: string
  duration: number
  occurrence: string
}

export type TaskFormValues = {
  title: string
  notes: string
  listId: string | null
  categoryId: string | null
  dueDate: string | null
  dueTime: string | null
  planTimes: PlanTimeDraft[]
  focused: boolean
  repeatRule: RecurrenceRule | null
}

export type TaskFormInitialValues = Partial<TaskFormValues>

type TaskFormProps = {
  mode: 'create' | 'edit'
  task?: TaskWithList
  lists: List[]
  categories: Category[]
  initialListId?: string | null
  initialCategoryId?: string | null
  initialValues?: TaskFormInitialValues
  initialTimeBlock?: TimeBlock | null
  initialTimeBlocks?: TimeBlock[]
  focusPlanTime?: boolean
  disabled?: boolean
  error?: string | null
  onCancel?: () => void
  onCreateEvent?: (values: TaskFormValues) => void
  onSubmit: (values: TaskFormValues) => void | Promise<void>
}

const durationOptions = [15, 30, 45, 60, 90, 120]
const weekdayOptions = [
  { value: 1, short: 'Mon', label: 'Monday' },
  { value: 2, short: 'Tue', label: 'Tuesday' },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday' },
  { value: 5, short: 'Fri', label: 'Friday' },
  { value: 6, short: 'Sat', label: 'Saturday' },
  { value: 7, short: 'Sun', label: 'Sunday' },
]

function dateLabel(value: string | null) {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day, 12))
}

function timeValueLabel(value: string | null, timeFormat: TimeFormat) {
  if (!value) return ''
  const [hours, minutes] = value.split(':').map(Number)
  const date = new Date(2000, 0, 1, hours, minutes)
  return formatTime(date, timeFormat)
}

function weekdayForDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return ((new Date(year, month - 1, day, 12).getDay() + 6) % 7) + 1
}

function initialPlanTime(block?: TimeBlock | null): PlanTimeDraft | null {
  if (!block) return null
  const start = Date.parse(block.starts_at)
  if (!Number.isFinite(start)) return null
  return {
    id: block.id,
    date: localDateKey(new Date(start)),
    startTime: timeInput(start),
    duration: block.ends_at
      ? Math.max(SLOT_MINUTES, (Date.parse(block.ends_at) - start) / MINUTE)
      : SLOT_MINUTES,
    occurrence: String(start),
  }
}

function initialPlanTimes(
  blocks: TimeBlock[],
  fallback?: TimeBlock | null,
  recurrenceRule?: RecurrenceRule | null,
) {
  const recurringSessions = recurrenceRule?.scheduledSessions
  if (recurringSessions?.length) {
    const startDate = recurrenceRule?.startDate ?? ''
    return recurringSessions.map((session) => ({
      templateId: session.id,
      timeZone: session.timeZone,
      date: startDate,
      startTime: session.startTime,
      duration: session.durationMinutes ?? SLOT_MINUTES,
      occurrence: '',
    }))
  }
  const source = blocks.length ? blocks : fallback ? [fallback] : []
  return source.map(initialPlanTime).filter((plan): plan is PlanTimeDraft => Boolean(plan))
}

function planEndLabel(plan: PlanTimeDraft, timeFormat: TimeFormat) {
  const duration = Math.max(SLOT_MINUTES, plan.duration)
  const candidates = localTimeCandidates(plan.date, plan.startTime)
  const chosen = candidates.length === 1
    ? candidates[0]
    : candidates.find((candidate) => String(candidate) === plan.occurrence)
  if (chosen === undefined) return null
  return timeLabel(chosen + duration * MINUTE, timeFormat)
}

function MetadataRow({
  icon,
  label,
  summary,
  expanded,
  description,
  tone = 'neutral',
}: {
  icon: React.ReactNode
  label: string
  summary: React.ReactNode
  expanded?: React.ReactNode
  description?: React.ReactNode
  tone?: 'neutral' | 'deadline' | 'plan' | 'focus'
}) {
  const toneClass = {
    neutral: 'hover:bg-muted/50',
    deadline: 'bg-rose-50/45 hover:bg-rose-50/70 dark:bg-rose-950/10 dark:hover:bg-rose-950/20',
    plan: 'bg-blue-50/45 hover:bg-blue-50/70 dark:bg-blue-950/10 dark:hover:bg-blue-950/20',
    focus: 'bg-amber-50/60 hover:bg-amber-50/80 dark:bg-accent-soft dark:hover:bg-accent-soft',
  }[tone]

  return (
    <div className={cn('rounded-xl px-2.5 py-2 transition-colors', toneClass)}>
      <div className="grid grid-cols-[24px_minmax(5.5rem,7rem)_minmax(0,1fr)_24px] items-center gap-x-3">
        <span className="flex size-6 items-center justify-center text-muted-foreground" aria-hidden="true">
          {icon}
        </span>
        <span className="min-w-0 text-sm font-medium">{label}</span>
        <div className="col-start-3 col-end-5 min-w-0">{summary}</div>
        {expanded && (
          <div className="col-start-2 col-end-5 mt-3 min-w-0 sm:col-start-3">
            {expanded}
          </div>
        )}
        {description && (
          <p className="col-start-2 col-end-5 mt-2 text-xs leading-5 text-muted-foreground sm:col-start-3">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

function SectionToggle({
  open,
  label,
  summary,
  onClick,
  disabled,
}: {
  open: boolean
  label: string
  summary: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={open}
      className="h-auto min-h-8 w-full min-w-0 justify-start gap-3 px-0 py-0 text-left hover:bg-transparent"
    >
      <span className="min-w-0 truncate text-sm font-medium">{summary || `Add ${label.toLocaleLowerCase()}`}</span>
      <ChevronDown className={cn('ml-auto size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
    </Button>
  )
}

export function TaskForm({
  mode,
  task,
  lists,
  categories,
  initialListId = null,
  initialCategoryId = null,
  initialValues,
  initialTimeBlock,
  initialTimeBlocks = [],
  focusPlanTime = false,
  disabled = false,
  error,
  onCancel = () => {},
  onCreateEvent,
  onSubmit,
}: TaskFormProps) {
  const { preferences: calendarPreferences } = useCalendarPreferences()
  const initialPlanList = initialValues?.planTimes ?? initialPlanTimes(
    initialTimeBlocks ?? [],
    initialTimeBlock,
    initialValues?.repeatRule ?? task?.recurrence_rule,
  )
  const [title, setTitle] = useState(initialValues?.title ?? task?.title ?? '')
  const [notes, setNotes] = useState(initialValues?.notes ?? task?.notes ?? '')
  const [listId, setListId] = useState(initialValues?.listId ?? task?.list_id ?? initialListId ?? null)
  const [categoryId, setCategoryId] = useState(
    initialValues?.categoryId ?? task?.category_id ?? initialCategoryId ?? null,
  )
  const [dueDate, setDueDate] = useState(initialValues?.dueDate ?? task?.due_date ?? null)
  const [dueTime, setDueTime] = useState(initialValues?.dueTime ?? task?.due_time ?? null)
  const [planTimes, setPlanTimes] = useState<PlanTimeDraft[]>(initialPlanList)
  const [deadlineOpen, setDeadlineOpen] = useState(Boolean(initialValues?.dueDate ?? task?.due_date))
  const [planOpen, setPlanOpen] = useState(initialPlanList.length > 0 || focusPlanTime)
  const [focused, setFocused] = useState(initialValues?.focused ?? task?.focused ?? false)
  const [repeatRule, setRepeatRule] = useState<RecurrenceRule | null>(initialValues?.repeatRule ?? task?.recurrence_rule ?? null)

  const availableCategories = useMemo(
    () => categories
      .filter((category) => category.list_id === listId)
      .sort((a, b) => a.position - b.position),
    [categories, listId],
  )
  const selectedCategory = availableCategories.find((category) => category.id === categoryId)
  const weekdayRepeat = repeatRule?.frequency === 'weekly' || repeatRule?.frequency === 'custom'
  const customRepeat = repeatRule?.frequency === 'custom'

  function changeList(value: string) {
    const nextListId = value === 'inbox' ? null : value
    setListId(nextListId)
    // Categories are list-owned. Never let an old-list category linger.
    if (nextListId !== listId) setCategoryId(null)
  }

  function openDeadline() {
    setDeadlineOpen((open) => !open)
    if (dueDate === null) setDueTime(null)
  }

  function openPlanTime() {
    setPlanOpen((open) => !open)
    if (!planTimes.length) {
      setPlanTimes([{
        date: repeatRule?.startDate ?? localDateKey(),
        startTime: '09:00',
        duration: SLOT_MINUTES,
        occurrence: '',
      }])
    }
  }

  function addPlanTime() {
    setPlanOpen(true)
    setPlanTimes((current) => [...current, {
      date: repeatRule?.startDate ?? localDateKey(),
      startTime: '09:00',
      duration: SLOT_MINUTES,
      occurrence: '',
    }])
  }

  function toggleRepeatWeekday(day: number) {
    setRepeatRule((current) => {
      if (!current) return current
      const selected = current.weekdays ?? [weekdayForDate(current.startDate)]
      const next = selected.includes(day)
        ? selected.filter((value) => value !== day)
        : [...selected, day]
      // Weekly repeats need at least one selected day. Custom repeats may be
      // cleared to keep their legacy every-N-days behavior.
      if (current.frequency === 'weekly' && next.length === 0) return current
      return { ...current, weekdays: next.length ? [...new Set(next)].sort() : undefined }
    })
  }

  function updatePlanTime(index: number, change: Partial<PlanTimeDraft>) {
    setPlanTimes((current) => current.map((plan, planIndex) =>
      planIndex === index ? { ...plan, ...change } : plan,
    ))
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || !title.trim()) return
    void onSubmit(currentValues())
  }

  function currentValues(): TaskFormValues {
    return {
      title: title.trim(),
      notes,
      listId,
      categoryId: listId ? categoryId : null,
      dueDate,
      dueTime: dueDate ? dueTime : null,
      planTimes,
      focused,
      repeatRule,
    }
  }

  return (
    <form onSubmit={submit} aria-busy={disabled} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="task-title" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Type className="size-4" aria-hidden="true" />
                <span>Title</span>
              </label>
              <Input
                autoFocus
                id="task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What needs to be done?"
                className="h-12 border-0 bg-transparent px-0 text-xl font-semibold shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 sm:text-2xl"
                required
                disabled={disabled}
              />
            </div>
            <div className="space-y-2 border-t border-border/60 pt-4">
              <label htmlFor="task-notes" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <NotebookPen className="size-4" aria-hidden="true" />
                <span>Notes</span>
              </label>
              <Textarea
                id="task-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add notes…"
                className="min-h-14 resize-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                disabled={disabled}
              />
            </div>
          </div>

        <div className="h-px bg-border" />

        <div className="divide-y divide-border/60">
          <MetadataRow
            icon={<FolderOpen className="size-4" />}
            label="List"
            summary={
              <Select value={listId ?? 'inbox'} onValueChange={changeList} disabled={disabled}>
                <SelectTrigger className="h-8 w-full max-w-none border-0 bg-transparent px-0 text-sm shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbox" title="Tasks not assigned to a list"><ListX className="size-4" />Unsorted</SelectItem>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      <ListEmoji emoji={list.emoji} />
                      {list.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />

          <MetadataRow
            icon={<Repeat className="size-4" />}
            label="Repeat"
            summary={
              <Select
                value={repeatRule?.frequency ?? 'never'}
                onValueChange={(value) => {
                  if (value === 'never') {
                    setRepeatRule(null)
                    return
                  }
                  const frequency = value as RecurrenceRule['frequency']
                  const startDate = repeatRule?.startDate ?? planTimes[0]?.date ?? dueDate ?? localDateKey()
                  setRepeatRule({
                    frequency,
                    startDate,
                    interval: repeatRule?.interval ?? 1,
                    weekdays: frequency === 'weekly' || frequency === 'custom'
                      ? repeatRule?.weekdays ?? [weekdayForDate(startDate)]
                      : undefined,
                    endDate: repeatRule?.endDate ?? null,
                    count: repeatRule?.count ?? null,
                    scheduledSessions: repeatRule?.scheduledSessions,
                  })
                  setPlanTimes((current) => current.map((plan) => ({
                    ...plan,
                    date: startDate,
                    occurrence: '',
                  })))
                }}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 w-full max-w-none border-0 bg-transparent px-0 text-sm shadow-none focus:ring-0">
                  <SelectValue placeholder="Never" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="daily">Every day</SelectItem>
                  <SelectItem value="weekday">Every weekday</SelectItem>
                  <SelectItem value="weekly">Every week</SelectItem>
                  <SelectItem value="monthly">Every month</SelectItem>
                  <SelectItem value="yearly">Every year</SelectItem>
                  <SelectItem value="custom">Custom interval</SelectItem>
                </SelectContent>
              </Select>
            }
            description={repeatRule ? `${recurrenceLabel(repeatRule)} · each occurrence keeps its own completion state.` : 'Keep this task one-time, or choose a repeat pattern.'}
            expanded={repeatRule && (
              <div className="grid gap-3 rounded-xl border border-border/70 bg-background/60 p-3 sm:grid-cols-2">
                {customRepeat && (
                  <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground sm:col-span-2">
                    <span>Repeat every</span>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={repeatRule.interval ?? 1}
                      onChange={(event) => setRepeatRule({
                        ...repeatRule,
                        interval: event.target.value ? Math.max(1, Number(event.target.value)) : 1,
                      })}
                      disabled={disabled}
                      className="h-9 w-20 bg-background text-sm font-normal text-foreground"
                      aria-label="Custom repeat interval"
                    />
                    <span className="font-normal">{repeatRule.weekdays?.length ? 'week(s)' : 'day(s)'}</span>
                  </label>
                )}
                {weekdayRepeat && (
                  <fieldset className="space-y-2 sm:col-span-2">
                    <legend className="text-xs font-medium text-muted-foreground">Repeat on</legend>
                    <div className="grid grid-cols-7 gap-1.5">
                      {weekdayOptions.map((day) => {
                        const selected = repeatRule.weekdays?.includes(day.value) ?? false
                        return (
                          <Button
                            key={day.value}
                            type="button"
                            size="sm"
                            variant={selected ? 'default' : 'outline'}
                            className="h-9 min-w-0 px-1 text-[11px] sm:text-xs"
                            aria-label={`Repeat on ${day.label}`}
                            aria-pressed={selected}
                            onClick={() => toggleRepeatWeekday(day.value)}
                            disabled={disabled}
                          >
                            {day.short}
                          </Button>
                        )
                      })}
                    </div>
                    {customRepeat && (
                      <p className="text-xs leading-5 text-muted-foreground">
                        Choose days for a weekly pattern, or clear them to repeat every number of days.
                      </p>
                    )}
                  </fieldset>
                )}
                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  Starts on
                  <Input
                    type="date"
                    required
                    value={repeatRule.startDate}
                    onChange={(event) => {
                      const startDate = event.target.value
                      setRepeatRule({ ...repeatRule, startDate })
                      setPlanTimes((current) => current.map((plan) => ({ ...plan, date: startDate, occurrence: '' })))
                    }}
                    disabled={disabled}
                    className="h-10 bg-background text-sm font-normal text-foreground"
                  />
                </label>
                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  Repeat until <span className="font-normal">(optional)</span>
                  <Input
                    type="date"
                    value={repeatRule.endDate ?? ''}
                    onChange={(event) => setRepeatRule({ ...repeatRule, endDate: event.target.value || null })}
                    disabled={disabled}
                    className="h-10 bg-background text-sm font-normal text-foreground"
                  />
                </label>
                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  Occurrences <span className="font-normal">(optional)</span>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={repeatRule.count ?? ''}
                    onChange={(event) => setRepeatRule({ ...repeatRule, count: event.target.value ? Number(event.target.value) : null })}
                    disabled={disabled}
                    className="h-10 bg-background text-sm font-normal text-foreground"
                  />
                </label>
              </div>
            )}
          />

          <MetadataRow
            icon={<Tag className="size-4" />}
            label="Category"
            summary={
              <Select
                value={categoryId ?? 'uncategorized'}
                onValueChange={(value) => setCategoryId(value === 'uncategorized' ? null : value)}
                disabled={disabled || !listId}
              >
                <SelectTrigger className="h-8 w-full max-w-none border-0 bg-transparent px-0 text-sm shadow-none focus:ring-0 disabled:opacity-60">
                  <SelectValue placeholder={listId ? 'Uncategorized' : 'Uncategorized · choose a list first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {availableCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            description={
              !listId
                ? 'Choose a list to use categories.'
                : listId && !selectedCategory && categoryId
                  ? <span className="text-destructive">Choose a category from this list.</span>
                  : undefined
            }
          />

          <MetadataRow
            icon={<CalendarDays className="size-4" />}
            label="Finish by"
            tone="deadline"
            summary={
              <SectionToggle
                open={deadlineOpen}
                disabled={disabled}
                label="finish by"
                summary={dueDate ? `${dateLabel(dueDate)}${dueTime ? ` · ${timeValueLabel(dueTime, calendarPreferences.timeFormat)}` : ''}` : ''}
                onClick={openDeadline}
              />
            }
            description="Optional final target for completing the task. It does not add a scheduled session."
            expanded={deadlineOpen && (
              <div className="rounded-xl border border-rose-200/70 bg-background/70 p-3.5 dark:border-rose-900/40 dark:bg-background/30">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block min-w-0 space-y-1.5 text-xs font-medium text-muted-foreground">
                    Date
                    <Input
                      type="date"
                      value={dueDate ?? ''}
                      onChange={(event) => {
                        const value = event.target.value || null
                        setDueDate(value)
                        if (!value) setDueTime(null)
                      }}
                      disabled={disabled}
                      className="h-10 rounded-lg border-rose-200/80 bg-background text-sm font-normal text-foreground focus-visible:border-rose-400 focus-visible:ring-rose-500/30 dark:border-rose-900/60"
                    />
                  </label>
                  <label className="block min-w-0 space-y-1.5 text-xs font-medium text-muted-foreground">
                    Time <span className="font-normal">(optional)</span>
                    <Input
                      type="time"
                      value={dueTime ?? ''}
                      onChange={(event) => setDueTime(event.target.value || null)}
                      disabled={disabled || !dueDate}
                      className="h-10 rounded-lg border-rose-200/80 bg-background text-sm font-normal text-foreground focus-visible:border-rose-400 focus-visible:ring-rose-500/30 dark:border-rose-900/60"
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-rose-200/60 pt-3 dark:border-rose-900/40">
                  {[
                    ['Today', 0],
                    ['Tomorrow', 1],
                    ['Next week', 7],
                  ].map(([shortcutLabel, offset]) => (
                    <Button
                      key={shortcutLabel}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 bg-background/80 px-2.5 text-xs"
                      disabled={disabled}
                      onClick={() => {
                        const date = new Date()
                        date.setDate(date.getDate() + Number(offset))
                        setDueDate(localDateKey(date))
                      }}
                    >
                      {shortcutLabel}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2.5 text-xs text-muted-foreground"
                    disabled={disabled || !dueDate}
                    onClick={() => {
                      setDueDate(null)
                      setDueTime(null)
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          />

          <MetadataRow
            icon={<Clock3 className="size-4" />}
            label="Schedule"
            tone="plan"
            summary={
              <SectionToggle
                open={planOpen}
                disabled={disabled}
                label="schedule"
                summary={planTimes.length
                  ? `${planTimes.length} session${planTimes.length === 1 ? '' : 's'} · ${planTimes.map((plan) => timeValueLabel(plan.startTime, calendarPreferences.timeFormat)).join(', ')}`
                  : ''}
                onClick={openPlanTime}
              />
            }
            description="When you intend to work on it. Add as many separate sessions as you need."
            expanded={planOpen && (
              <div className="space-y-3 rounded-xl border border-blue-200/70 bg-background/70 p-3.5 dark:border-blue-900/40 dark:bg-background/30">
                {planTimes.map((planTime, index) => {
                  const candidates = localTimeCandidates(planTime.date, planTime.startTime)
                  return (
                    <div key={planTime.id ?? `new-${index}`} className="space-y-3 rounded-lg border border-blue-200/60 p-3 dark:border-blue-900/40">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-muted-foreground">Session {index + 1}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove session ${index + 1}`}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setPlanTimes((current) => current.filter((_, planIndex) => planIndex !== index))}
                          disabled={disabled}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {!repeatRule && (
                          <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                            Date
                            <Input
                              type="date"
                              required
                              value={planTime.date}
                              onChange={(event) => updatePlanTime(index, { date: event.target.value, occurrence: '' })}
                              disabled={disabled}
                              className="h-10 rounded-lg border-blue-200/80 bg-background text-sm font-normal text-foreground focus-visible:border-blue-400 focus-visible:ring-blue-500/30 dark:border-blue-900/60"
                            />
                          </label>
                        )}
                        <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                          Start time
                          <Input
                            type="time"
                            required
                            step={60}
                            value={planTime.startTime}
                            onChange={(event) => updatePlanTime(index, { startTime: event.target.value, occurrence: '' })}
                            disabled={disabled}
                            className="h-10 rounded-lg border-blue-200/80 bg-background text-sm font-normal text-foreground focus-visible:border-blue-400 focus-visible:ring-blue-500/30 dark:border-blue-900/60"
                          />
                        </label>
                      </div>
                      <label className="block max-w-[12rem] space-y-1.5 text-xs font-medium text-muted-foreground">
                        Duration
                        <Select
                          value={durationOptions.includes(planTime.duration) ? String(planTime.duration) : 'custom'}
                          onValueChange={(value) => updatePlanTime(index, { duration: value === 'custom' ? planTime.duration : Number(value) })}
                          disabled={disabled}
                        >
                          <SelectTrigger className="h-10 w-full border-blue-200/80 bg-background text-sm font-normal text-foreground dark:border-blue-900/60"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {durationOptions.map((duration) => (
                              <SelectItem key={duration} value={String(duration)}>{duration < 60 ? `${duration} min` : `${duration / 60} hour${duration === 60 ? '' : 's'}`}</SelectItem>
                            ))}
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </label>
                      {!durationOptions.includes(planTime.duration) && (
                        <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                          Custom duration in minutes
                          <Input
                            type="number"
                            min={15}
                            step={15}
                            value={planTime.duration}
                            onChange={(event) => updatePlanTime(index, { duration: Number(event.target.value) })}
                            disabled={disabled}
                            className="h-10 rounded-lg border-blue-200/80 bg-background text-sm font-normal text-foreground focus-visible:border-blue-400 focus-visible:ring-blue-500/30 dark:border-blue-900/60"
                          />
                        </label>
                      )}
                      {candidates.length === 0 ? (
                        <p role="alert" className="text-xs text-destructive">This local time does not exist. Choose another time.</p>
                      ) : candidates.length > 1 ? (
                        <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                          This time occurs twice. Choose an occurrence.
                          <Select value={planTime.occurrence} onValueChange={(value) => updatePlanTime(index, { occurrence: value })} disabled={disabled}>
                            <SelectTrigger className="h-10 border-blue-200/80 bg-background text-sm font-normal text-foreground dark:border-blue-900/60"><SelectValue placeholder="Choose an occurrence" /></SelectTrigger>
                            <SelectContent>
                              {candidates.map((candidate, candidateIndex) => <SelectItem key={candidate} value={String(candidate)}>{candidateIndex === 0 ? 'First' : 'Second'} · {timeLabel(candidate, calendarPreferences.timeFormat)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </label>
                      ) : (
                        <p className="text-xs text-muted-foreground">{planTime.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone} · {planEndLabel(planTime, calendarPreferences.timeFormat) ? `${timeValueLabel(planTime.startTime, calendarPreferences.timeFormat)} – ${planEndLabel(planTime, calendarPreferences.timeFormat)}` : 'elapsed time'}</p>
                      )}
                    </div>
                  )
                })}
                <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={addPlanTime} disabled={disabled}>
                  Add another time
                </Button>
              </div>
            )}
          />

          <MetadataRow
            icon={<Star className={cn('size-4', focused && 'fill-current text-amber-500 dark:text-accent')} />}
            label="Focus"
            tone={focused ? 'focus' : 'neutral'}
            summary={
              <Button
                type="button"
                variant="ghost"
                role="switch"
                aria-checked={focused}
                onClick={() => setFocused((value) => !value)}
                disabled={disabled}
                className={cn('h-8 justify-start px-2 text-sm', focused && 'text-amber-600 hover:text-amber-700 dark:text-accent dark:hover:text-accent-hover')}
              >
                {focused
                  ? <Check className="size-4" />
                  : <Star className="size-4 text-muted-foreground/70" />}
                {focused ? 'On' : 'Off'}
              </Button>
            }
            description="Keep this among your three priorities on Home."
          />
        </div>
      </div>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex shrink-0 flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end">
        {mode === 'create' && onCreateEvent ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => onCreateEvent(currentValues())}
            disabled={disabled || !title.trim()}
            className="sm:mr-auto"
          >
            <CalendarDays />
            Create event
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onCancel} disabled={disabled}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={disabled || !title.trim()}
          className="bg-primary text-primary-foreground hover:bg-accent-hover active:bg-accent-active focus-visible:ring-primary/40"
        >
          {disabled ? 'Saving…' : mode === 'create' ? 'Add task' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
