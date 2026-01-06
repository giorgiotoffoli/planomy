'use client'

import type { List, Task } from '@/types/task'
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
  const [open, setOpen] = useState(false)
  const checkboxRef = useRef<HTMLButtonElement | null>(null)

  return (
    <li
      className="flex justify-between items-center group 
               transition-all duration-200 
               rounded-md p-2 hover:bg-gray-300"
    >
      <div className="flex flex-col">
        <div className="flex items-center">
          <Checkbox
            ref={checkboxRef}
            className="mr-2 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 border-blue-500"
            checked={task.completed}
            onCheckedChange={(checked) => {
              if (checked && !task.completed) {
                requestAnimationFrame(() => {
                  const rect = checkboxRef.current?.getBoundingClientRect()
                  if (!rect) return confetti()

                  const x = (rect.left + rect.width / 2) / window.innerWidth
                  const y = (rect.top + rect.height / 2) / window.innerHeight

                  confetti({
                    origin: { x, y },
                    particleCount: 24,
                    spread: 25,
                    startVelocity: 30,
                    gravity: 2,
                    ticks: 90,
                    scalar: 0.65,
                  })
                })
              }

              toggleComplete(task.id)
            }}
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
          <PopoverContent className="w-auto">
            <div className="p-2">
              <header className="flex items-center justify-between">
                <h2 className="text-xl font-bold truncate">{task.name}</h2>
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
                          const dateTime = date?.toDateString()
                          addTaskDate(task.id, dateTime)
                          setOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <label htmlFor="input">Time: </label>
                <input
                  type="time"
                  autoFocus={false}
                  onChange={(e) => {
                    addTaskTime(task.id, e.target.value)
                  }}
                  value={task.dueTime ?? ''}
                />
              </div>
              <div>
                <p>Notes: </p>
                <Textarea
                  autoFocus={false}
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
