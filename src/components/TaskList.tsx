import { useState, useEffect } from 'react'
import TaskItem from './TaskItem'
import NewTaskPrompt from './NewTaskPrompt'
import type { Task, List } from '../types/task'
import type { KeyboardEvent } from 'react'
import { Button } from './ui/button'
import { PlusIcon } from 'lucide-react'

type TaskListProps = {
  activeList: List
  taskList: Task[]
  setTaskList: React.Dispatch<React.SetStateAction<Task[]>>
  lists: List[]
}

const TaskList = ({ activeList, taskList, setTaskList }: TaskListProps) => {
  const [visibleTaskList, setVisibleTaskList] = useState<Task[]>([])
  const [showTaskInput, setShowTaskInput] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [newTaskName, setNewTaskName] = useState('')
  const [editTaskId, setEditTaskId] = useState('')

  useEffect(() => {
    console.log(taskList)
    updateVisibleTasks()
  }, [taskList])

  useEffect(() => {
    updateVisibleTasks()
  }, [activeList])

  const addTaskToTaskList = () => {
    if (!taskName) return

    const newTask: Task = {
      id: crypto.randomUUID(),
      name: taskName,
      completed: false,
      ...(activeList.id !== 'All' &&
        activeList.id !== 'Scheduled' &&
        activeList.id !== 'Today' &&
        activeList.id !== 'Completed' && {
          list: activeList,
        }),
    }

    setTaskList((prevTasks) => [...prevTasks, newTask])
    setTaskName('')
    setShowTaskInput(false)
  }

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
      const today = new Date().toISOString().slice(0, 10)
      setVisibleTaskList(
        taskList.filter(
          (taskObject) =>
            (taskObject.dueDate == today ||
              (!taskObject.dueDate && taskObject.dueTime)) &&
            !taskObject.completed
        )
      )
    } else {
      setVisibleTaskList(
        taskList.filter((taskObject) => taskObject.list?.id === activeList.id)
      )
    }
  }

  const handleOnKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addTaskToTaskList()
    } else if (e.key === 'Escape') {
      setShowTaskInput(false)
    }
  }

  const editTask = (taskId: string) => {
    setEditTaskId(taskId)
  }

  const renameTask = (taskId: string, oldName: string) => {
    const newName: string = newTaskName.trim() ?? ''
    if (!newName || newName === oldName) {
      setEditTaskId('')
      return
    }

    setTaskList((prevTasks) =>
      prevTasks.map((taskObject) =>
        taskObject.id === taskId
          ? { ...taskObject, name: newTaskName }
          : taskObject
      )
    )
    setEditTaskId('')
  }

  const toggleComplete = (taskId: string) => {
    setTaskList((prevTasks) =>
      prevTasks.map((taskObject) =>
        taskObject.id === taskId
          ? { ...taskObject, completed: !taskObject.completed }
          : taskObject
      )
    )
  }

  const removeTask = (taskId: string) => {
    setTaskList((prevTasks) =>
      prevTasks.filter((taskObject) => taskObject.id !== taskId)
    )
  }

  const addTaskDate = (taskId: string, date: string) => {
    setTaskList((prevTasks) =>
      prevTasks.map((taskObject) =>
        taskObject.id === taskId ? { ...taskObject, dueDate: date } : taskObject
      )
    )
  }

  const addTaskTime = (taskId: string, time: string) => {
    setTaskList((prevTasks) =>
      prevTasks.map((taskObject) =>
        taskObject.id === taskId ? { ...taskObject, dueTime: time } : taskObject
      )
    )
  }

  const addTaskNote = (taskId: string, note: string) => {
    setTaskList((prevTask) =>
      prevTask.map((taskObject) =>
        taskObject.id === taskId ? { ...taskObject, note: note } : taskObject
      )
    )
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex justify-between items-center bg-white border-b px-4 py-1">
        <h1 className="font-bold text-3xl p-4 sm:ml-0 ml-4">
          {activeList.title}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto scroll-smooth pb-24">
        <ul className="px-4 py-3">
          {!showTaskInput && visibleTaskList.length === 0 && (
            <h2>Great job! Everything is done.</h2>
          )}

          {visibleTaskList.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              editTask={editTask}
              renameTask={renameTask}
              toggleComplete={toggleComplete}
              removeTask={removeTask}
              editTaskId={editTaskId}
              newTaskName={newTaskName}
              setNewTaskName={setNewTaskName}
              addTaskDate={addTaskDate}
              addTaskTime={addTaskTime}
              addTaskNote={addTaskNote}
              activeList={activeList}
            />
          ))}

          {showTaskInput && (
            <NewTaskPrompt
              addTaskToTaskList={addTaskToTaskList}
              handleOnKeyDown={handleOnKeyDown}
              taskName={taskName}
              setTaskName={setTaskName}
            />
          )}
        </ul>
      </div>

      <div className="sticky bottom-0 z-20 backdrop-blur-md bg-white/60 border-t border-white/20">
        <div className="mx-auto max-w-md p-3 flex justify-center">
          <Button
            onClick={() => setShowTaskInput(true)}
            className="bg-gray-800 rounded-lg text-sm px-4 py-3 hover:cursor-pointer hover:bg-gray-900 transition-colors duration-200 shadow-lg mb-3"
          >
            <PlusIcon /> New task
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TaskList
