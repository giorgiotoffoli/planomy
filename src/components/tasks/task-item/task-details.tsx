import { List, TaskWithList } from '@/types'
import { format, isBefore } from 'date-fns'
import { ListPlus } from 'lucide-react'
import Link from 'next/link'
import { ListEmoji } from '@/components/lists/list-emoji'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TaskEditMoveList } from './task-edit/task-edit-move-list'

interface TaskDetailProps {
  task: TaskWithList
  currentListId: string | null
  lists: List[]
  isInbox: boolean
  showDueDate?: boolean
  showAddToList?: boolean
}

function dateStringToLocalDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getDateString(offset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offset)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDueDateLabel(dueDate: string | null) {
  if (!dueDate) return null

  const today = getDateString(0)
  const tomorrow = getDateString(1)
  const yesterday = getDateString(-1)

  if (dueDate === today) {
    return {
      label: 'Today',
      isOverdue: false,
    }
  }

  if (dueDate === tomorrow) {
    return {
      label: 'Tomorrow',
      isOverdue: false,
    }
  }

  if (dueDate === yesterday) {
    return {
      label: 'Yesterday',
      isOverdue: true,
    }
  }

  const dueDateObject = dateStringToLocalDate(dueDate)
  const todayObject = dateStringToLocalDate(today)

  return {
    label: format(dueDateObject, 'M/dd/yyyy'),
    isOverdue: isBefore(dueDateObject, todayObject),
  }
}

export default function TaskDetail({
  task,
  lists,
  currentListId,
  isInbox,
  showDueDate = true,
  showAddToList = false,
}: TaskDetailProps) {
  const dueDateInfo = getDueDateLabel(task.due_date)

  const taskList = task.list_id
    ? lists.find((list) => list.id === task.list_id) ?? task.list
    : null

  const shouldShowTaskList =
    !isInbox &&
    (task.list_id !== null
      ? currentListId !== task.list_id
      : showAddToList && lists.length > 0)

  const taskListLabel = task.list_id && taskList ? (
    <span className="flex min-w-0 items-center gap-1">
      <ListEmoji emoji={taskList.emoji} className="text-sm" />
      <span className="truncate">{taskList.title}</span>
    </span>
  ) : task.list_id === null && showAddToList && lists.length > 0 ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Add to list"
          className="inline-flex max-w-0 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-sm text-center text-primary opacity-0 outline-none transition-[max-width,opacity] duration-200 ease-out group-hover:max-w-28 group-hover:opacity-100 group-focus-within:max-w-28 group-focus-within:opacity-100 hover:text-primary/80 hover:underline focus-visible:max-w-28 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/40 motion-reduce:transition-none"
        >
          <ListPlus aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="whitespace-nowrap">Add to list</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuLabel>Add to list</DropdownMenuLabel>
        <TaskEditMoveList
          taskId={task.id}
          lists={lists}
          currentListId={currentListId}
          taskListId={task.list_id}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null

  const taskListHref = task.list_id
    ? `/lists/${task.list_id}?view=${taskList?.default_view ?? 'list'}`
    : '/home'

  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-xs text-muted-foreground">
      {/* Notes */}
      {task.notes && <p>{task.notes}</p>}
      {/* Metadata */}
      {((showDueDate && dueDateInfo) || (shouldShowTaskList && taskListLabel)) && (
        <div className="flex min-w-0 items-center gap-1.5">
          {showDueDate && dueDateInfo && (
            <span className={dueDateInfo.isOverdue ? 'text-destructive' : ''}>
              {dueDateInfo.label}
            </span>
          )}

          {showDueDate && dueDateInfo && shouldShowTaskList && taskListLabel && (
            <span className="text-muted-foreground/60">·</span>
          )}

          {shouldShowTaskList && taskListLabel && (
            <Link
              href={taskListHref}
              className="min-w-0 truncate hover:text-primary hover:cursor-pointer"
            >
              {taskListLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
