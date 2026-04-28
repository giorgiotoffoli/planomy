import TaskList from '@/components/lists/TaskList'
import { getTasks } from '../../../components/tasks/queries'
import { Suspense } from 'react'
import Header from '@/components/layout/header/Header'
import { getUserLists } from '@/components/lists/queries'

export default async function InboxPage() {
  const tasks = await getTasks('today')
  const lists = await getUserLists()

  return (
    <>
      <Header taskCount={tasks.length} headerTitle="Today" />
      {tasks.length === 0 ? (
        <p>Nothing scheduled for today.</p>
      ) : (
        <Suspense fallback={<h1>Loading tasks...</h1>}>
          <TaskList tasks={tasks} lists={lists} />
        </Suspense>
      )}
    </>
  )
}
