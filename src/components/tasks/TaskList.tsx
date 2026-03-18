import CreateTaskButton from './create-task/CreateTaskButton'
import CreateTaskDialog from './create-task/CreateTaskDialog'
import { TaskItem } from './task-item/TaskItem'
import { Task } from './types'

export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <div className="flex flex-col h-full sm:w-full">
      <CreateTaskDialog>
        <CreateTaskButton />
      </CreateTaskDialog>
      <div className="flex-1 overflow-y-auto scroll-smooth pb-6">
        {tasks?.length ? (
          <ul>
            {tasks?.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </ul>
        ) : (
          <p className="py-4">Great job! Everything is done</p>
        )}
      </div>
    </div>
  )
}

export default TaskList
