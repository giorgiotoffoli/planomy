import { TaskItem } from '../tasks/task-item/TaskItem'
import { List, TaskWithList } from '../../types'

interface TaskListProps {
  localTasks: TaskWithList[]
  lists: List[]
  currentListId?: string
  handleOnComplete: (taskId: string, isCompleted: boolean) => void
  handleOnRename: (taskId: string, newName: string) => void
  handleOnDueDateChange: (taskId: string, newDueDate: string) => void
  handleOnNotesChange: (taskId: string, notes: string) => void
}

export default function TaskList({
  localTasks,
  lists,
  currentListId,
  handleOnComplete,
  handleOnRename,
  handleOnDueDateChange,
  handleOnNotesChange,
}: TaskListProps) {
  return (
    <>
      <div className="flex flex-col h-full sm:w-full">
        <div className="flex-1 overflow-y-auto scroll-smooth pb-16">
          <ul>
            {localTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                lists={lists}
                currentListId={currentListId}
                handleOnComplete={handleOnComplete}
                handleOnRename={handleOnRename}
                handleOnDueDateChange={handleOnDueDateChange}
                handleOnNotesChange={handleOnNotesChange}
              />
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
