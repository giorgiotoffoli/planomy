import TaskList from './components/TaskList'
import { useState, useEffect } from 'react'
import AppSidebar from './components/AppSidebar'
import type { Task, List } from './types/task'

function App() {
  const TASKS_KEY = 'planomy_tasks'
  const LISTS_KEY = 'plaonmy_lists'

  const [taskList, setTaskList] = useState<Task[]>(() => {
    const stored = localStorage.getItem(TASKS_KEY)
    return stored ? JSON.parse(stored) : []
  })

  const [lists, setLists] = useState<List[]>(() => {
    const stored = localStorage.getItem(LISTS_KEY)
    return stored ? JSON.parse(stored) : []
  })

  const [activeFilter, setActiveFilter] = useState<string>('Inbox')

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(taskList))
  }, [taskList])

  useEffect(() => {
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists))
  }, [lists])

  const changeFilter = (newFilter: string) => {
    setActiveFilter(newFilter)
  }

  const deleteListTasks = (listFilter: string) => {
    setTaskList(
      taskList.filter((taskObject) => taskObject.filter !== listFilter)
    )
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar
          changeFilter={changeFilter}
          deleteListTasks={deleteListTasks}
          lists={lists}
          setLists={setLists}
        />
        <main className="w-full flex-1">
          <TaskList
            filter={activeFilter}
            taskList={taskList}
            setTaskList={setTaskList}
          />
        </main>
      </div>
    </>
  )
}

export default App
