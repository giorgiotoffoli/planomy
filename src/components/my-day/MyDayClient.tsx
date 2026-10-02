'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Plus, Star, StarOff } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { DailySelection, List, TaskWithList } from '@/types'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { decryptString, encryptString } from '@/lib/crypto/e2ee'
import { localDateKey, previousDateKey } from '@/lib/my-day'
import { getMyDayData, removeTaskFromDay, selectTaskForDay, setTaskFocused } from './actions'
import { createTask, deleteTask, renameTask, updateTaskCompleted, updateTaskDueDate, updateTaskNotes } from '@/components/tasks/actions'
import Header from '@/components/layout/header/Header'
import { TaskItem } from '@/components/tasks/task-item/TaskItem'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import CreateTaskDialog from '@/components/tasks/create-task/CreateTaskDialog'

type LoadedData = { tasks: TaskWithList[]; selections: DailySelection[] }

export default function MyDayClient({ encryptedLists }: { encryptedLists: List[] }) {
  const { masterKey } = useE2EE()
  const [day, setDay] = useState(() => localDateKey())
  const [data, setData] = useState<LoadedData | null>(null)
  const [lists, setLists] = useState<List[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [retrySelection, setRetrySelection] = useState<string | null>(null)

  const load = useCallback(async (activeDay: string) => {
    if (!masterKey) return
    setError(null)
    try {
      const result = await getMyDayData(activeDay)
      const decryptedLists = await Promise.all(encryptedLists.map(async list => ({ ...list, title: await decryptString(list.title, masterKey) })))
      const decryptedTasks = await Promise.all(result.tasks.map(async task => ({
        ...task,
        title: await decryptString(task.title, masterKey),
        notes: task.notes ? await decryptString(task.notes, masterKey) : task.notes,
        list: task.list ? { ...task.list, title: await decryptString(task.list.title, masterKey) } : null,
      })))
      setLists(decryptedLists)
      setData({ tasks: decryptedTasks, selections: result.selections })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'My Day could not be loaded.')
    }
  }, [encryptedLists, masterKey])

  useEffect(() => {
    const timeout = window.setTimeout(() => load(day), 0)
    return () => window.clearTimeout(timeout)
  }, [day, load])
  useEffect(() => {
    const refreshDay = () => {
      const next = localDateKey()
      if (next === day) load(next)
      else { setData(null); setDay(next) }
    }
    const interval = window.setInterval(refreshDay, 60_000)
    const onVisibility = () => { if (!document.hidden) refreshDay() }
    window.addEventListener('focus', refreshDay)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refreshDay); document.removeEventListener('visibilitychange', onVisibility) }
  }, [day, load])

  const todaySelections = useMemo(() => new Map(data?.selections.filter(s => s.selected_date === day).map(s => [s.task_id, s]) ?? []), [data, day])
  const yesterdayIds = useMemo(() => new Set(data?.selections.filter(s => s.selected_date === previousDateKey(day)).map(s => s.task_id) ?? []), [data, day])
  const incomplete = data?.tasks.filter(task => !task.completed) ?? []
  const chosen = incomplete.filter(task => todaySelections.has(task.id)).sort((a, b) => Number(todaySelections.get(b.id)?.focused) - Number(todaySelections.get(a.id)?.focused))
  const fromYesterday = incomplete.filter(task => yesterdayIds.has(task.id) && !todaySelections.has(task.id))
  const yesterdaySet = new Set(fromYesterday.map(task => task.id))
  const suggestions = incomplete.filter(task => task.due_date && task.due_date <= day && !todaySelections.has(task.id) && !yesterdaySet.has(task.id))
  const completed = data?.tasks.filter(task => task.completed && todaySelections.has(task.id)) ?? []

  function updateTask(taskId: string, change: Partial<TaskWithList>) {
    setData(current => current && ({ ...current, tasks: current.tasks.map(task => task.id === taskId ? { ...task, ...change } : task) }))
  }
  async function optimisticTask(taskId: string, change: Partial<TaskWithList>, operation: () => Promise<unknown>) {
    const previous = data
    updateTask(taskId, change)
    try { await operation() } catch (cause) { setData(previous); toast.error(cause instanceof Error ? cause.message : 'Change was not saved') }
  }
  async function add(taskId: string) {
    try {
      await selectTaskForDay(taskId, day)
      setData(current => current && ({ ...current, selections: [...current.selections.filter(s => !(s.task_id === taskId && s.selected_date === day)), { task_id: taskId, selected_date: day, focused: false }] }))
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Task was not added') }
  }
  async function remove(taskId: string) {
    const previous = data
    setData(current => current && ({ ...current, selections: current.selections.filter(s => !(s.task_id === taskId && s.selected_date === day)) }))
    try { await removeTaskFromDay(taskId, day) } catch (cause) { setData(previous); toast.error(cause instanceof Error ? cause.message : 'Task was not removed') }
  }
  async function retryAdd(taskId: string) {
    try {
      await selectTaskForDay(taskId, day)
      setData(current => current && ({ ...current, selections: [...current.selections.filter(s => !(s.task_id === taskId && s.selected_date === day)), { task_id: taskId, selected_date: day, focused: false }] }))
      setRetrySelection(null)
      toast.success('Task added to My Day')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Task was not added')
    }
  }
  async function focus(taskId: string, focused: boolean) {
    if (focused && [...todaySelections.values()].filter(selection => selection.focused).length >= 3) {
      toast.error('You can focus up to three tasks. Unpin one first.')
      return
    }
    const previous = data
    setData(current => current && ({ ...current, selections: current.selections.map(s => s.task_id === taskId && s.selected_date === day ? { ...s, focused } : s) }))
    try { await setTaskFocused(taskId, day, focused) } catch (cause) { setData(previous); toast.error(cause instanceof Error ? cause.message : 'Focus was not changed') }
  }

  const row = (task: TaskWithList, section: 'chosen' | 'yesterday' | 'suggestion' | 'completed') => {
    const focused = todaySelections.get(task.id)?.focused ?? false
    return <TaskItem key={task.id} task={task} lists={lists} currentListId={null} highlighted={false} shouldHideCompleted={false} isInbox={false} canReorder={false}
      handleOnComplete={(id, value) => optimisticTask(id, { completed: value }, () => updateTaskCompleted(id, value))}
      handleOnRename={(id, title) => { if (!masterKey) return; optimisticTask(id, { title }, async () => renameTask(id, await encryptString(title, masterKey))) }}
      handleOnDueDateChange={(id, due_date) => optimisticTask(id, { due_date }, () => updateTaskDueDate(id, due_date))}
      handleOnNotesChange={(id, notes) => { if (!masterKey) return; optimisticTask(id, { notes }, async () => updateTaskNotes(id, await encryptString(notes, masterKey))) }}
      handleOnDelete={(id) => optimisticTask(id, {}, async () => { await deleteTask(id); setData(current => current && ({ ...current, tasks: current.tasks.filter(t => t.id !== id) })) })}
      leadingBadge={focused ? <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-amber-600"><Star className="size-3 fill-current" /> Focus</span> : undefined}
      trailingActions={section === 'chosen' ? <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="size-8" aria-label={focused ? 'Unpin from focus' : 'Pin to focus'} onClick={() => focus(task.id, !focused)}>{focused ? <StarOff /> : <Star />}</Button>
        <Button variant="outline" size="sm" onClick={() => remove(task.id)}>Remove</Button>
      </div> : section === 'completed' ? undefined : <Button variant="outline" size="sm" onClick={() => add(task.id)}>{section === 'yesterday' ? 'Bring forward' : 'Add'}</Button>}
    />
  }

  async function createAndSelect(title: string, dueDate: string, notes: string, listId: string | null) {
    if (!masterKey) return
    try {
      const saved = await createTask(await encryptString(title, masterKey), dueDate, notes ? await encryptString(notes, masterKey) : '', listId)
      if (!saved) throw new Error('Task was not created')
      const list = lists.find(item => item.id === listId) ?? null
      const decryptedTask = { ...saved, title, notes, list } as TaskWithList
      setData(current => current && ({ ...current, tasks: [decryptedTask, ...current.tasks] }))
      try {
        await selectTaskForDay(saved.id, day)
        setData(current => current && ({ ...current, selections: [...current.selections, { task_id: saved.id, selected_date: day, focused: false }] }))
        setRetrySelection(null)
      } catch { setRetrySelection(saved.id) }
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Task was not created') }
  }

  return <>
    <Header headerTitle="My Day" taskCount={chosen.length} rightSlot={<CreateTaskDialog lists={lists} listId={null} handleOnCreate={createAndSelect}><Button size="sm"><Plus /> Quick capture</Button></CreateTaskDialog>} />
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 overflow-y-auto pb-20">
      <div><h1 className="text-2xl font-semibold">{format(new Date(`${day}T12:00:00`), 'EEEE, MMMM d')}</h1><p className="text-sm text-muted-foreground">Your personal workspace for today</p></div>
      {retrySelection && <div role="alert" className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><span>The task was created, but could not be added to My Day.</span><Button size="sm" onClick={() => retryAdd(retrySelection)}>Retry</Button></div>}
      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4"><p>{error}</p><Button className="mt-2" variant="outline" onClick={() => load(day)}>Try again</Button></div>}
      {!data && !error && <div className="space-y-3" aria-label="Loading My Day"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-3/4" /></div>}
      {data && <>
        <section className="rounded-2xl border bg-card p-3 shadow-sm sm:p-5"><div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="font-semibold">Chosen for today</h2><p className="text-xs text-muted-foreground">Pin up to three tasks to focus.</p></div><Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}><Plus /> Add existing task</Button></div>
          {chosen.length ? <ul className="space-y-1">{chosen.map(task => row(task, 'chosen'))}</ul> : <p className="rounded-xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">Nothing chosen yet. Add a task when you’re ready.</p>}
        </section>
        {fromYesterday.length > 0 && <section><h2 className="mb-2 font-semibold">From yesterday</h2><p className="mb-2 text-sm text-muted-foreground">Unfinished tasks stay on their original day until you bring them forward.</p><ul>{fromYesterday.map(task => row(task, 'yesterday'))}</ul></section>}
        <section><h2 className="mb-2 font-semibold">Suggestions</h2><p className="mb-2 text-sm text-muted-foreground">Due today or overdue — add only what fits.</p>{suggestions.length ? <ul>{suggestions.map(task => row(task, 'suggestion'))}</ul> : <p className="text-sm text-muted-foreground">No due or overdue suggestions.</p>}</section>
        {completed.length > 0 && <Collapsible><CollapsibleTrigger asChild><Button variant="ghost" className="w-full justify-between">Completed today ({completed.length}) <ChevronDown /></Button></CollapsibleTrigger><CollapsibleContent><ul className="opacity-70">{completed.map(task => row(task, 'completed'))}</ul></CollapsibleContent></Collapsible>}
      </>}
    </div>
    <CommandDialog open={pickerOpen} onOpenChange={setPickerOpen} title="Add an existing task" description="Search incomplete tasks across your plans">
      <CommandInput placeholder="Search tasks or plans…" autoFocus />
      <CommandList><CommandEmpty>No incomplete tasks found.</CommandEmpty><CommandGroup heading="Incomplete tasks">
        {incomplete.map(task => <CommandItem key={task.id} value={`${task.title} ${task.list?.title ?? 'Inbox'}`} disabled={todaySelections.has(task.id)} onSelect={() => { add(task.id); setPickerOpen(false) }}><div className="min-w-0"><p className="truncate">{task.title}</p><p className="text-xs text-muted-foreground">{task.list?.title ?? 'Inbox'}{task.due_date ? ` · Due ${task.due_date}` : ''}</p></div><span className="ml-auto text-xs">{todaySelections.has(task.id) ? 'Added' : 'Add'}</span></CommandItem>)}
      </CommandGroup></CommandList>
    </CommandDialog>
  </>
}
