import { getList, getListTasks } from '@/components/lists/queries'
import TaskList from '@/components/layout/TaskList'
import { Suspense } from 'react'
import Header from '@/components/layout/header/Header'

export default async function InboxPage({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const { listId } = await params

  const tasks = await getListTasks(listId)
  const list = await getList(listId)

  return (
    <>
      <Header taskCount={tasks.length} headerTitle={list.title} />
      <Suspense fallback={<h1>Loading tasks...</h1>}>
        <TaskList tasks={tasks} />
      </Suspense>
    </>
  )
}
