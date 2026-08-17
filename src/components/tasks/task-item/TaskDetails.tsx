import { List, TaskWithList } from '@/types'
import { format, isBefore } from 'date-fns'

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

export default function TaskDetail({ task }: TaskDetailProps) {
  const dueDateInfo = getDueDateLabel(task.due_date)

  return (
    <span className="text-xs text-gray-600 block">
      {/* Date */}
      {dueDateInfo && (
        <>
          <span className={dueDateInfo.isOverdue ? 'text-rose-500' : ''}>
            {dueDateInfo.label}
          </span>
          <br />
        </>
      )}

      {/* Notes */}
      {task.notes && (
        <>
          <span>{task.notes}</span>
          <br />
        </>
      )}
    </span>
  )
}
