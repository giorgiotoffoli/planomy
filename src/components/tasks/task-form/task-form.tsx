'use client'

import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  FolderOpen,
  Inbox,
  NotebookPen,
  Star,
  Tag,
  Type,
} from 'lucide-react'
import type { Category, List, TaskWithList, TimeBlock } from '@/types'
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
import { localTimeCandidates, MINUTE, timeInput, timeLabel } from '@/lib/agenda'

export type PlanTimeDraft = {
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
  planTime: PlanTimeDraft | null
  focused: boolean
}

type TaskFormProps = {
  mode: 'create' | 'edit'
  task?: TaskWithList
  lists: List[]
  categories: Category[]
  initialListId?: string | null
  initialCategoryId?: string | null
  initialTimeBlock?: TimeBlock | null
  focusPlanTime?: boolean
  disabled?: boolean
  onCancel?: () => void
  onSubmit: (values: TaskFormValues) => void | Promise<void>
}

const durationOptions = [15, 30, 45, 60, 90, 120]

function dateLabel(value: string | null) {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day, 12))
}

function timeValueLabel(value: string | null) {
  if (!value) return ''
  const [hours, minutes] = value.split(':').map(Number)
  const date = new Date(2000, 0, 1, hours, minutes)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function initialPlanTime(block?: TimeBlock | null): PlanTimeDraft | null {
  if (!block) return null
  const start = Date.parse(block.starts_at)
  if (!Number.isFinite(start)) return null
  return {
    date: localDateKey(new Date(start)),
    startTime: timeInput(start),
    duration: Math.max(15, (Date.parse(block.ends_at) - start) / MINUTE),
    occurrence: String(start),
  }
}

function planEndLabel(plan: PlanTimeDraft) {
  const candidates = localTimeCandidates(plan.date, plan.startTime)
  const chosen = candidates.length === 1
    ? candidates[0]
    : candidates.find((candidate) => String(candidate) === plan.occurrence)
  if (chosen === undefined) return null
  return timeLabel(chosen + plan.duration * MINUTE)
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
    focus: 'bg-amber-50/60 hover:bg-amber-50/80 dark:bg-amber-950/10 dark:hover:bg-amber-950/20',
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
}: {
  open: boolean
  label: string
  summary: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
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
  initialTimeBlock,
  focusPlanTime = false,
  disabled = false,
  onCancel = () => {},
  onSubmit,
}: TaskFormProps) {
  const initialPlan = initialPlanTime(initialTimeBlock)
  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [listId, setListId] = useState(task?.list_id ?? initialListId ?? null)
  const [categoryId, setCategoryId] = useState(
    task?.category_id ?? initialCategoryId ?? null,
  )
  const [dueDate, setDueDate] = useState(task?.due_date ?? null)
  const [dueTime, setDueTime] = useState(task?.due_time ?? null)
  const [planTime, setPlanTime] = useState<PlanTimeDraft | null>(initialPlan)
  const [deadlineOpen, setDeadlineOpen] = useState(Boolean(task?.due_date))
  const [planOpen, setPlanOpen] = useState(Boolean(initialPlan) || focusPlanTime)
  const [focused, setFocused] = useState(task?.focused ?? false)

  const availableCategories = useMemo(
    () => categories
      .filter((category) => category.list_id === listId)
      .sort((a, b) => a.position - b.position),
    [categories, listId],
  )
  const selectedCategory = availableCategories.find((category) => category.id === categoryId)

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
    if (!planTime) {
      setPlanTime({
        date: localDateKey(),
        startTime: '09:00',
        duration: 30,
        occurrence: '',
      })
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit({
      title: title.trim(),
      notes,
      listId,
      categoryId: listId ? categoryId : null,
      dueDate,
      dueTime: dueDate ? dueTime : null,
      planTime,
      focused,
    })
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
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
                  <SelectItem value="inbox"><Inbox className="size-4" />Inbox</SelectItem>
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
            label="Deadline"
            tone="deadline"
            summary={
              <SectionToggle
                open={deadlineOpen}
                label="deadline"
                summary={dueDate ? `${dateLabel(dueDate)}${dueTime ? ` · ${timeValueLabel(dueTime)}` : ''}` : ''}
                onClick={openDeadline}
              />
            }
            description="When this needs to be finished. This does not add an Agenda block."
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
            label="Plan time"
            tone="plan"
            summary={
              <SectionToggle
                open={planOpen}
                label="plan time"
                summary={planTime ? `${dateLabel(planTime.date)} · ${timeValueLabel(planTime.startTime)}${planEndLabel(planTime) ? ` – ${planEndLabel(planTime)}` : ''}` : ''}
                onClick={openPlanTime}
              />
            }
            description="When you intend to work on it."
            expanded={planOpen && planTime && (
              <div className="space-y-3 rounded-xl border border-blue-200/70 bg-background/70 p-3.5 dark:border-blue-900/40 dark:bg-background/30">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                    Date
                    <Input
                      type="date"
                      required
                      value={planTime.date}
                      onChange={(event) => setPlanTime({ ...planTime, date: event.target.value, occurrence: '' })}
                      disabled={disabled}
                      className="h-10 rounded-lg border-blue-200/80 bg-background text-sm font-normal text-foreground focus-visible:border-blue-400 focus-visible:ring-blue-500/30 dark:border-blue-900/60"
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                    Start time
                    <Input
                      type="time"
                      required
                      step={60}
                      value={planTime.startTime}
                      onChange={(event) => setPlanTime({ ...planTime, startTime: event.target.value, occurrence: '' })}
                      disabled={disabled}
                      className="h-10 rounded-lg border-blue-200/80 bg-background text-sm font-normal text-foreground focus-visible:border-blue-400 focus-visible:ring-blue-500/30 dark:border-blue-900/60"
                    />
                  </label>
                </div>
                <label className="block max-w-[12rem] space-y-1.5 text-xs font-medium text-muted-foreground">
                  Duration
                  <Select
                    value={durationOptions.includes(planTime.duration) ? String(planTime.duration) : 'custom'}
                    onValueChange={(value) => setPlanTime({ ...planTime, duration: value === 'custom' ? planTime.duration : Number(value) })}
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
                      onChange={(event) => setPlanTime({ ...planTime, duration: Number(event.target.value) })}
                      disabled={disabled}
                      className="h-10 rounded-lg border-blue-200/80 bg-background text-sm font-normal text-foreground focus-visible:border-blue-400 focus-visible:ring-blue-500/30 dark:border-blue-900/60"
                    />
                  </label>
                )}
                {(() => {
                  const candidates = localTimeCandidates(planTime.date, planTime.startTime)
                  if (candidates.length === 0) {
                    return <p role="alert" className="text-xs text-destructive">This local time does not exist. Choose another time.</p>
                  }
                  if (candidates.length > 1) {
                    return (
                      <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                        This time occurs twice. Choose an occurrence.
                        <Select value={planTime.occurrence} onValueChange={(value) => setPlanTime({ ...planTime, occurrence: value })} disabled={disabled}>
                          <SelectTrigger className="h-10 border-blue-200/80 bg-background text-sm font-normal text-foreground dark:border-blue-900/60"><SelectValue placeholder="Choose an occurrence" /></SelectTrigger>
                          <SelectContent>
                            {candidates.map((candidate, index) => <SelectItem key={candidate} value={String(candidate)}>{index === 0 ? 'First' : 'Second'} · {timeLabel(candidate)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </label>
                    )
                  }
                  return <p className="text-xs text-muted-foreground">{Intl.DateTimeFormat().resolvedOptions().timeZone} · elapsed time</p>
                })()}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-0 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setPlanTime(null)
                    setPlanOpen(false)
                  }}
                  disabled={disabled}
                >
                  Remove Plan time
                </Button>
              </div>
            )}
          />

          <MetadataRow
            icon={<Star className={cn('size-4', focused && 'fill-current text-amber-500')} />}
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
                className={cn('h-8 justify-start px-2 text-sm', focused && 'text-amber-600 hover:text-amber-700')}
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

      <div className="mt-6 flex shrink-0 flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={disabled}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={disabled || !title.trim()}
          className="bg-blue-500 text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)] hover:bg-blue-600 focus-visible:ring-blue-500/40"
        >
          {mode === 'create' ? 'Add task' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
