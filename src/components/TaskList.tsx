import { useState, useEffect } from 'react'
import TaskItem from './TaskItem'
import NewTaskPrompt from './NewTaskPrompt'
import type { Task } from '../types/task'
import type { KeyboardEvent } from 'react'
import { Button } from './ui/button'

type TaskListProps = {
  filter: string
}

const TaskList = ({ filter }: TaskListProps) => {
  const TASKS_KEY = 'planomy_tasks'

  const [taskList, setTaskList] = useState<Task[]>(() => {
    const stored = localStorage.getItem(TASKS_KEY)
    return stored ? JSON.parse(stored) : []
  })
  const [visibleTaskList, setVisibleTaskList] = useState<Task[]>([])
  const [showTaskInput, setShowTaskInput] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [newTaskName, setNewTaskName] = useState('')
  const [editTaskId, setEditTaskId] = useState('')

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(taskList))
  }, [taskList])

  useEffect(() => {
    console.log(taskList)
    updateVisibleTasks()
  }, [taskList])

  useEffect(() => {
    updateVisibleTasks()
  }, [filter])

  const addTaskToTaskList = () => {
    if (!taskName) return

    const newTask: Task = {
      id: crypto.randomUUID(),
      name: taskName,
      completed: false,
      filter: filter,
    }

    setTaskList((prevTasks) => [...prevTasks, newTask])
    setTaskName('')
    setShowTaskInput(false)
  }

  const updateVisibleTasks = () => {
    if (filter === 'All') {
      setVisibleTaskList([...taskList])
    } else if (filter === 'Inbox') {
      setVisibleTaskList(
        taskList.filter(
          (taskObject) =>
            !(
              taskObject.filter !== 'Inbox' &&
              taskObject.filter !== 'All' &&
              taskObject.filter !== 'Completed' &&
              taskObject.filter !== 'Scheduled' &&
              taskObject.filter !== 'Today' &&
              taskObject.filter !== 'Inbox'
            )
        )
      )
    } else if (filter === 'Completed') {
      setVisibleTaskList(taskList.filter((taskObject) => taskObject.completed))
    } else if (filter === 'Scheduled') {
      setVisibleTaskList(
        taskList.filter(
          (taskObject) => taskObject.dueDate || taskObject.dueTime
        )
      )
    } else if (filter === 'Today') {
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
        taskList.filter((taskObject) => taskObject.filter === filter)
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
        <h1 className="font-bold text-3xl p-4">{filter}</h1>
        <Button
          onClick={() => setShowTaskInput(true)}
          className="bg-gray-800 rounded-lg text-sm p-3 m-3 hover:cursor-pointer hover:bg-gray-900 transition-colors duration-200 float-end"
        >
          New task
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto scroll-smooth">
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
              listFilter={filter}
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
    </div>
  )
}

export default TaskList
