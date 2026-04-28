import CreateTaskButton from '../tasks/create-task/CreateTaskButton'
import CreateTaskDialog from '../tasks/create-task/CreateTaskDialog'
import { TaskItem } from '../tasks/task-item/TaskItem'
import { List, TaskWithList } from '../../types'

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
        </div>
      </div>
    </>
  )
}

export default TaskList
