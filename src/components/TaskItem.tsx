import type { List, Task } from '../types/task'
import { Checkbox } from './ui/checkbox'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Textarea } from './ui/textarea'
import { Trash } from 'lucide-react'

type TaskItemProps = {
  task: Task
  editTask: (taskId: string) => void
  renameTask: (taskId: string, oldTaskName: string) => void
  toggleComplete: (taskId: string) => void
  removeTask: (taskId: string) => void
  newTaskName: string
  setNewTaskName: (e: string) => void
  editTaskId: string
  addTaskDate: (taskId: string, date: string) => void
  addTaskTime: (taskId: string, time: string) => void
  addTaskNote: (taskId: string, note: string) => void
  activeList: List
}

function TaskItem({
  task,
  editTask,
  renameTask,
  toggleComplete,
  removeTask,
  editTaskId,
  newTaskName,
  setNewTaskName,
  addTaskDate,
  addTaskTime,
  addTaskNote,
  activeList,
}: TaskItemProps) {
  return (
    <li
      className="flex justify-between items-center group 
               transition-all duration-200 
               rounded-md p-2 hover:bg-gray-300"
    >
      <div className="flex flex-col">
        <div className="flex items-center">
          <Checkbox
            className="mr-2 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 border-blue-500"
            onCheckedChange={() => toggleComplete(task.id)}
            checked={task.completed ? true : false}
          />

          {editTaskId === task.id ? (
            <input
              className="outline-0 w-full"
              type="text"
              onBlur={() => renameTask(task.id, task.name)}
              placeholder="Edit task name..."
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
            />
          ) : (
            <span
              onClick={() => editTask(task.id)}
              className={task.completed ? 'opacity-75 line-through' : 'my-auto'}
            >
              {task.name}
            </span>
          )}
        </div>
        <span className="text-xs">
          {!task.list?.id && 'Uncategorized'}
          {activeList.id !== task.list?.id &&
            task.list?.id &&
            `${task.list?.title}`}
          {task.dueDate && ` ${task.dueDate}`}
          {task.dueDate && task.dueTime && <span>, </span>}
          {task.dueTime && `${task.dueTime}`}
          {task.note && ` • ${task.note}`}
        </span>
      </div>

      <div>
        <Popover>
          <PopoverTrigger>
            <Button variant="ghost" className="mr-3 cursor-pointer">
              ⋯
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="p-2">
              <header className="flex items-center justify-between">
                <h2 className="text-xl font-bold truncate">{task.name}</h2>
              </header>
              <div>
                <label htmlFor="input">Date: </label>
                <input
                  type="date"
                  onChange={(e) => {
                    addTaskDate(task.id, e.target.value)
                  }}
                  value={task.dueDate ?? ''}
                />
              </div>
              <div>
                <label htmlFor="input">Time: </label>
                <input
                  type="time"
                  onChange={(e) => {
                    addTaskTime(task.id, e.target.value)
                  }}
                  value={task.dueTime ?? ''}
                />
              </div>
              <div>
                <p>Notes: </p>
                <Textarea
                  onChange={(e) => {
                    addTaskNote(task.id, e.target.value)
                  }}
                  value={task.note ?? ''}
                />
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p>Status: {task.completed ? 'Completed' : 'Incompleted'}</p>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <button
                    className=" text-red-500  hover:text-red-700 p-2 rounded-2xl cursor-pointer"
                    onClick={() => removeTask(task.id)}
                  >
                    <span className="flex">
                      <Trash />
                      Delete
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </li>
  )
}

export default TaskItem
