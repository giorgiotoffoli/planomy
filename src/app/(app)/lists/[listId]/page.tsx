import { getList, getListTasks, getUserLists } from '@/components/lists/queries'
import Header from '@/components/layout/header/Header'
import getStatuses from '@/components/boards/queries'
import TaskViewSwitcher from '@/components/layout/TaskClient'

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
      {tasks.length === 0 ? (
        <p>This list is empty. Click '+' to add your first task.</p>
      ) : (
        <TaskViewSwitcher
          tasks={tasks}
          currentView={currentView}
          listId={listId}
          lists={lists}
          statuses={statuses}
        />
      )}
    </>
  )
}
