import TaskList from './components/TaskList'
import { useState } from 'react'
import AppSidebar from './components/AppSidebar'

function App() {
  const [activeFilter, setActiveFilter] = useState<string>('Inbox')

  const changeFilter = (newFilter: string) => {
    setActiveFilter(newFilter)
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar changeFilter={changeFilter} />
        <main className="w-full flex-1">
          <TaskList filter={activeFilter} />
        </main>
      </div>
    </>
  )
}

export default App
