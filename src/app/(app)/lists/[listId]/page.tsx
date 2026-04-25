import { getList, getListTasks, getUserLists } from '@/components/lists/queries'
import TaskList from '@/components/lists/TaskList'
import { Suspense } from 'react'
import Header from '@/components/layout/header/Header'

interface ListPageProps {
  params: Promise<{ listId: string }>
}

export default async function ListPage({ params }: ListPageProps) {
  const { listId } = await params

  const tasks = await getListTasks(listId)
  const lists = await getUserLists()
  const currentList = await getList(listId)

  return (
    <>
      <Header taskCount={tasks.length} headerTitle={currentList.title} />
      <Suspense fallback={<h1>Loading tasks...</h1>}>
        <TaskList tasks={tasks} lists={lists} currentListId={listId} />
      </Suspense>
    </>
  )
}
