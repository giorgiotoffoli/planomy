import TaskList from '@/components/lists/TaskList'
import { getTasks } from '../../../components/tasks/queries'
import { Suspense } from 'react'
import Header from '@/components/layout/header/Header'
import { getUserLists } from '@/components/lists/queries'

export default async function InboxPage() {
  const tasks = await getTasks('scheduled')
  const lists = await getUserLists()

  return (
    <>
      <Header taskCount={tasks.length} headerTitle="Scheduled" />
      {tasks.length === 0 ? (
        <p>There are no upcoming tasks.</p>
      ) : (
        <Suspense fallback={<h1>Loading tasks...</h1>}>
          <TaskList tasks={tasks} lists={lists} />
        </Suspense>
      )}
    </>
  )
}
