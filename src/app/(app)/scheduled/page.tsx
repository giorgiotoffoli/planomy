import TaskList from '@/components/layout/TaskList'
import { getTasks } from '../../queries'
import { Suspense } from 'react'
import Header from '@/components/layout/header/Header'

export default async function InboxPage() {
  const tasks = await getTasks('scheduled')

  return (
    <>
      <Header taskCount={tasks.length} headerTitle="Scheduled" />
      <Suspense fallback={<h1>Loading tasks...</h1>}>
        <TaskList tasks={tasks} />
      </Suspense>
    </>
  )
}
