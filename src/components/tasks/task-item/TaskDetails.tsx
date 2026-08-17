import { List, TaskWithList } from '@/types'
import { format, isBefore } from 'date-fns'
import { InboxIcon, NotebookPenIcon } from 'lucide-react'
import Link from 'next/link'

interface TaskDetailProps {
  task: TaskWithList
  currentListId: string | null
  lists: List[]
  isInbox: boolean
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
}: TaskDetailProps) {
  const dueDateInfo = getDueDateLabel(task.due_date)

  const taskList = task.list_id
    ? lists.find((list) => list.id === task.list_id)
    : null

  const shouldShowTaskList =
    !isInbox && (task.list_id === null || currentListId !== task.list_id)

  const taskListLabel = task.list_id ? (
    taskList?.title
  ) : (
    <div className="flex gap-1 items-center">
      <InboxIcon size={12} />
      Inbox
    </div>
  )

  const taskListHref = task.list_id
    ? `/lists/${task.list_id}?view=${taskList?.default_view ?? 'list'}`
    : '/inbox'

  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-xs text-gray-600">
      {/* Notes */}
      {task.notes && <p>{task.notes}</p>}
      {/* Metadata */}
      {(dueDateInfo || (shouldShowTaskList && taskListLabel)) && (
        <div className="flex min-w-0 items-center gap-1.5">
          {dueDateInfo && (
            <span className={dueDateInfo.isOverdue ? 'text-rose-500' : ''}>
              {dueDateInfo.label}
            </span>
          )}

          {dueDateInfo && shouldShowTaskList && taskListLabel && (
            <span className="text-gray-400">·</span>
          )}

          {shouldShowTaskList && taskListLabel && (
            <Link
              href={taskListHref}
              className="min-w-0 truncate hover:text-blue-500 hover:cursor-alias"
            >
              {taskListLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
