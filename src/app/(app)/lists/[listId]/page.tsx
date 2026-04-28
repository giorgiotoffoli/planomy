import { getList, getListTasks, getUserLists } from '@/components/lists/queries'
import TaskList from '@/components/lists/TaskList'
import { Suspense } from 'react'
import Header from '@/components/layout/header/Header'
import ListBoardToggle from '@/components/layout/ListBoardToggle'
import TaskBoard from '@/components/boards/TaskBoard'
import getStatuses from '@/components/boards/queries'

interface ListPageProps {
  params: Promise<{ listId: string }>
  searchParams: Promise<{ view?: string }>
}

export default async function ListPage({
  params,
  searchParams,
}: ListPageProps) {
  const { listId } = await params
  const { view } = await searchParams

  const tasks = await getListTasks(listId)
  const lists = await getUserLists()
  const currentList = await getList(listId)
  const statuses = await getStatuses(listId)

  const currentView = view === 'board' ? 'board' : 'list'

  return (
    <>
      <Header taskCount={tasks.length} headerTitle={currentList.title} />
      <ListBoardToggle listId={listId} currentView={currentView} />

      {tasks.length === 0 ? (
        <p>This list is empty. Click '+' to add your first task.</p>
      ) : (
        <Suspense fallback={<h1>Loading tasks...</h1>}>
          {currentView === 'list' ? (
            <TaskList tasks={tasks} lists={lists} currentListId={listId} />
          ) : (
            <TaskBoard
              tasks={tasks}
              statuses={statuses}
              lists={lists}
              currentListId={listId}
            />
          )}
        </Suspense>
      )}
    </>
  )
}
