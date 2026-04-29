import { TaskWithList } from '@/types'
import { format, isBefore } from 'date-fns'
import Link from 'next/link'

interface TaskDetailProps {
  task: TaskWithList
  currentListId: string | undefined
}

export default function TaskDetail({ task, currentListId }: TaskDetailProps) {
  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <span className="text-xs text-gray-600 block">
      {/* Date */}
      {task.due_date === today ? (
        <span>Today</span>
      ) : task.due_date && isBefore(task.due_date, today) ? (
        <span className="text-rose-500">
          {task.due_date && `${format(task.due_date, 'M/dd/yyyy')}`}
        </span>
      ) : (
        <span>{task.due_date && `${format(task.due_date, 'M/dd/yyyy')}`}</span>
      )}
      {task.due_date && <br />}
      {/* Notes */}
      <span>{task.notes && `${task.notes}`}</span>
      {task.notes && <br />}
      {/* Parent List */}
      <span className="font-bold cursor-pointer hover:text-blue-500">
        {task.list?.id && currentListId === task.list?.id ? (
          ''
        ) : currentListId === 'Inbox' ? (
          ''
        ) : task.list?.title ? (
          <Link href={`'/lists/'${task.list.id}/view?=list`}>
            {task.list.title}
          </Link>
        ) : (
          <Link href={'/inbox'}>Inbox</Link>
        )}
      </span>
    </span>
  )
}
