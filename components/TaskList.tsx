'use client'

import { useState, useEffect } from 'react'
import TaskItem from './TaskItem'
import NewTaskPrompt from './NewTaskPrompt'
import type { Task, List } from '@/types/task'
import type { ActionDispatch, KeyboardEvent } from 'react'
import { Button } from './ui/button'
import { PlusIcon } from 'lucide-react'
import { ProgressiveBlur } from './ui/progressive-blur'

import type { TaskAction } from '@/types/task'
import { TASK_ACTIONS } from '@/types/task'

type TaskListProps = {
  activeList: List
  taskList: Task[]
  lists: List[]
  tasksDispatch: ActionDispatch<[action: TaskAction]>
}

const TaskList = ({
  activeList,
  taskList,
  tasksDispatch,
  lists,
}: TaskListProps) => {
  const [visibleTaskList, setVisibleTaskList] = useState<Task[]>([])
  const [showTaskInput, setShowTaskInput] = useState(false)

  useEffect(() => {
    console.log(taskList)
    updateVisibleTasks()
  }, [taskList])

  useEffect(() => {
    updateVisibleTasks()
  }, [activeList])

  useEffect(() => {
    updateVisibleTasks()
  }, [lists])

  const updateVisibleTasks = () => {
    if (activeList.id === 'All') {
      setVisibleTaskList([...taskList])
    } else if (activeList.id === 'Completed') {
      setVisibleTaskList(taskList.filter((taskObject) => taskObject.completed))
    } else if (activeList.id === 'Scheduled') {
      setVisibleTaskList(
        taskList.filter(
          (taskObject) => taskObject.dueDate || taskObject.dueTime
        )
      )
    } else if (activeList.id === 'Today') {
      const today = new Date().toLocaleDateString()
      setVisibleTaskList(
        taskList.filter((taskObject) => taskObject.dueDate === today)
      )
    } else {
      setVisibleTaskList(
        taskList.filter((taskObject) => taskObject.listId === activeList.id)
      )
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex justify-between items-center  border-b px-4 py-1">
        <h1 className="font-bold text-3xl p-4 sm:ml-0 ml-4 truncate">
          {activeList.title}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto scroll-smooth pb-6">
        <ul className="px-4 py-3">
          {!showTaskInput && visibleTaskList.length === 0 && (
            <h2>Great job! Everything is done.</h2>
          )}

          {visibleTaskList.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              activeList={activeList}
              tasksDispatch={tasksDispatch}
              lists={lists}
            />
          ))}

          {showTaskInput && (
            <NewTaskPrompt
              tasksDispatch={tasksDispatch}
              setShowTaskInput={setShowTaskInput}
              activeList={activeList}
            />
          )}
        </ul>
      </div>
      <Button
        onClick={() => setShowTaskInput(true)}
        className="bg-gray-800 rounded-lg text-sm px-4 py-3 hover:cursor-pointer hover:bg-gray-900 transition-colors duration-200 shadow-lg z-20 w-28 mx-auto mb-9"
      >
        <PlusIcon /> New task
      </Button>

      <ProgressiveBlur height="15%" position="bottom" />
    </div>
  )
}

export default TaskList
