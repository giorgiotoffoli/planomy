import { useDraggable } from '@dnd-kit/react'
import { Card, CardContent, CardDescription } from '../ui/card'
import { List, TaskWithList } from '../../types'
import { format, isBefore } from 'date-fns'

interface BoardTaskCard {
  task: TaskWithList
  lists: List[]
  currentListId: string
}

export default function BoardTaskCard({ task }: BoardTaskCard) {
  const { ref } = useDraggable({
    id: task.id,
  })

  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <li className="py-1">
      <Card
        ref={ref}
        className="hover:cursor-grab aria-grabbed:rotate-3 transition-all duration-75"
      >
        <CardContent>
          <div className="flex justify-between">{task.title}</div>
          <CardDescription>
            <span className="text-xs text-gray-600 block">
              {/* Date */}
              {task.due_date === today ? (
                <span>Today</span>
              ) : task.due_date && isBefore(task.due_date, today) ? (
                <span className="text-rose-500">
                  {task.due_date && `${format(task.due_date, 'M/dd/yyyy')}`}
                </span>
              ) : (
                <span>
                  {task.due_date && `${format(task.due_date, 'M/dd/yyyy')}`}
                </span>
              )}
              {task.due_date && <br />}
              {/* Notes */}
              <span>{task.notes && `${task.notes}`}</span>
            </span>
          </CardDescription>
        </CardContent>
      </Card>
    </li>
  )
}
