import TaskList from '@/components/lists/TaskList'
import { getTasks } from '../../../components/tasks/queries'
import { Suspense } from 'react'
import Header from '@/components/layout/header/Header'
import { getUserLists } from '@/components/lists/queries'

export default async function InboxPage() {
  const tasks = await getTasks('inbox')
  const lists = await getUserLists()

  return (
    <>
      <Header taskCount={tasks.length} headerTitle="Inbox" />
      {tasks.length === 0 ? (
        <p>Nothing in your inbox. Capture a task or enjoy the silence.</p>
      ) : (
        <Suspense fallback={<h1>Loading tasks...</h1>}>
          <TaskList tasks={tasks} lists={lists} currentListId="Inbox" />
        </Suspense>
      )}
    </>
  )
}
