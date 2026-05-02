import { getList, getListTasks, getUserLists } from '@/components/lists/queries'
import Header from '@/components/layout/header/Header'
import getStatuses from '@/components/boards/queries'
import TaskClient from '@/components/layout/TaskClient'
import HeaderViewToggle from '@/components/layout/header/HeaderViewToggle'

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
    <TaskClient
      tasks={tasks}
      currentView={currentView}
      listId={listId}
      lists={lists}
      statuses={statuses}
      headerTitle={currentList.title}
    />
  )
}
