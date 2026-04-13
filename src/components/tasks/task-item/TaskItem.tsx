import { List, Task } from '../types'
import { TaskEditButton } from './task-edit/TaskEditButton'
import { TaskEditDropdown } from './task-edit/TaskEditDropdown'
import { TaskCheckbox } from './TaskCheckbox'
import { TaskTitle } from './TaskTitle'
import { format, isBefore } from 'date-fns'

interface TaskItemProps {
  task: Task
  lists: List[]
  currentListId?: string
  parentList?: string
}

export function TaskItem({
  task,
  lists,
  currentListId,
  parentList,
}: TaskItemProps) {
  const today = format(new Date(), 'yyyy-MM-dd')
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
        <span className="text-xs text-gray-600">
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
          {/* Parent List */}
          <span>{parentList}</span>
        </span>
      </div>
      <div>
        <TaskEditDropdown
          task={task}
          lists={lists}
          currentListId={currentListId}
        >
          <TaskEditButton />
        </TaskEditDropdown>
      </div>
    </li>
  )
}
