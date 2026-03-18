import { Task } from '../types'
import { TaskEditButton } from './task-edit/TaskEditButton'
import { TaskEditDropdown } from './task-edit/TaskEditDropdown'
import { TaskCheckbox } from './TaskCheckbox'
import { TaskTitle } from './TaskTitle'
import { format, isBefore, isToday, parseISO } from 'date-fns'

export function TaskItem({ task }: { task: Task }) {
  const today = new Date()
  return (
    <li
      className="flex justify-between items-center group 
               transition-all duration-200 
               rounded-md p-2 hover:bg-gray-300"
    >
      <div className="flex flex-col w-full">
        <div className="flex items-center ">
          <TaskCheckbox task={task} />
          <TaskTitle task={task} />
        </div>
        <span className="text-xs flex justify-start gap-2">
          {/* Date */}
          {task.due_date && isBefore(task.due_date, today) ? (
            <span className="text-rose-500">
              {task.due_date && `${format(task.due_date, 'PPP')}`}
            </span>
          ) : (
            <span>{task.due_date && `${format(task.due_date, 'PPP')}`}</span>
          )}
          {/* Notes */}
          <span>{task.notes && `${task.notes}`}</span>
        </span>
      </div>
      <div>
        <TaskEditDropdown task={task}>
          <TaskEditButton />
        </TaskEditDropdown>
      </div>
    </li>
  )
}
