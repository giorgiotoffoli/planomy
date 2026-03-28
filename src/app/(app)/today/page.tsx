import TaskList from '@/components/layout/TaskList'
import { getTasks } from '../../queries'
import { Suspense } from 'react'
import Header from '@/components/layout/header/Header'
import { getUserLists } from '@/components/lists/queries'

export default async function InboxPage() {
  const tasks = await getTasks('today')
  const lists = await getUserLists()

  return (
    <>
      <Header taskCount={tasks.length} headerTitle="Today" />
      <Suspense fallback={<h1>Loading tasks...</h1>}>
        <TaskList tasks={tasks} lists={lists} />
      </Suspense>
    </>
  )
}
