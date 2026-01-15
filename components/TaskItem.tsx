'use client'

import type { Task } from '@/context/tasks/taskTypes'
import { Checkbox } from './ui/checkbox'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { ChevronDownIcon, Trash } from 'lucide-react'
import { Label } from './ui/label'
import { Calendar } from './ui/calendar'
import { useState } from 'react'
import confetti from 'canvas-confetti'
import { useRef } from 'react'
import { useTasks } from '@/context/tasks/TasksProvider'
import { TASK_ACTIONS } from '@/context/tasks/tasksActions'

type TaskItemProps = {
  task: Task
}

function TaskItem({ task }: TaskItemProps) {
  const [open, setOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editTaskId, setEditTaskId] = useState('')

  const checkboxRef = useRef<HTMLButtonElement | null>(null)
  const { dispatch: tasksDispatch } = useTasks()

  const renameTask = () => {
    const trimmedTitle = newTitle.trim()
    if (!newTitle || task.title === trimmedTitle) {
      setEditTaskId('')
      return
    }

    tasksDispatch({
      type: TASK_ACTIONS.RENAME,
      id: task.id,
      newTitle: trimmedTitle,
    })

    setEditTaskId('')
  }

  return (
    <li
      className="flex justify-between items-center group 
               transition-all duration-200 
               rounded-md p-2 hover:bg-gray-300"
    >
      <div className="flex flex-col w-full">
        <div className="flex items-center ">
          <Checkbox
            ref={checkboxRef}
            className="mr-2 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 border-blue-500"
            checked={task.completed}
            onCheckedChange={(checked) => {
              tasksDispatch({
                type: TASK_ACTIONS.TOGGLE_COMPLETE,
                id: task.id,
                completed: task.completed,
              })
            }}
          />

          {editTaskId === task.id ? (
            <form
              className="w-full"
              onSubmit={(e) => {
                e.preventDefault()
                renameTask()
              }}
            >
              <input
                className={`outline-0 w-full ${
                  task.completed ? 'opacity-75 line-through' : 'my-auto'
                }`}
                type="text"
                onBlur={renameTask}
                placeholder="Edit task name..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </form>
          ) : (
            <span
              onClick={() => {
                setNewTitle(task.title)
                setEditTaskId(task.id)
              }}
              className={` whitespace-pre-wrap ${
                task.completed ? 'opacity-75 line-through' : 'my-auto'
              }`}
            >
              {task.title}
            </span>
          )}
        </div>
        <span className="text-xs">
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
          <PopoverContent className="w-auto">
            <div className="p-2">
              <header className="flex items-center justify-between">
                <h2 className="text-xl font-bold truncate">{task.title}</h2>
              </header>
              <div>
                <div className="flex flex-col gap-3">
                  <Label htmlFor="date" className="px-1">
                    Date of birth
                  </Label>
                  <Popover open={open} onOpenChange={setOpen} modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        id="date"
                        className="w-48 justify-between font-normal"
                      >
                        {task.dueDate ? task.dueDate : 'Select date'}
                        <ChevronDownIcon />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto overflow-hidden p-0"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          if (!date) return
                          const isoDate = date?.toLocaleDateString()
                          tasksDispatch({
                            type: TASK_ACTIONS.SET_DATE,
                            id: task.id,
                            date: isoDate,
                          })
                          setOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label htmlFor="textarea" className="px-1">
                  Notes
                </Label>
                <Textarea
                  autoFocus={false}
                  onChange={(e) => {
                    tasksDispatch({
                      type: TASK_ACTIONS.SET_NOTE,
                      id: task.id,
                      note: e.target.value,
                    })
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
                    onClick={() =>
                      tasksDispatch({ type: TASK_ACTIONS.DELETE, id: task.id })
                    }
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
