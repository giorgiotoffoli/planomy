import CreateTaskButton from '../tasks/create-task/CreateTaskButton'
import CreateTaskDialog from '../tasks/create-task/CreateTaskDialog'
import { TaskItem } from '../tasks/task-item/TaskItem'
import { List, TaskWithList } from '../tasks/types'

interface TaskListProps {
  tasks: TaskWithList[]
  lists: List[]
  currentListId?: string
}

export function TaskList({ tasks, lists, currentListId }: TaskListProps) {
  return (
    <>
      <div className="flex flex-col h-full sm:w-full">
        <CreateTaskDialog>
          <CreateTaskButton />
        </CreateTaskDialog>
        <div className="flex-1 overflow-y-auto scroll-smooth pb-16">
          {tasks?.length ? (
            <ul>
              {tasks?.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  lists={lists}
                  currentListId={currentListId}
                />
              ))}
            </ul>
          ) : (
            <p className="py-4">Great job! Everything is done</p>
          )}
        </div>
      </div>
    </>
  )
}

export default TaskList
