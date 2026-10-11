import { getList, getListTasks, getUserLists } from '@/components/lists/queries'
import Header from '@/components/layout/header/app-header'
import getStatuses from '@/components/boards/queries'
import TaskWorkspace from '@/components/layout/task-workspace'
import HeaderViewToggle from '@/components/layout/header/header-view-toggle'

interface ListPageProps {
  params: Promise<{ 'list-id': string }>
  searchParams: Promise<{ view?: string }>
}

export default async function ListPage({
  params,
  searchParams,
}: ListPageProps) {
  const { 'list-id': listId } = await params
  const { view } = await searchParams

  const tasks = await getListTasks(listId)
  const lists = await getUserLists()
  const currentList = await getList(listId)
  const statuses = await getStatuses(listId)

  const currentView = view === 'board' ? 'board' : 'list'

  return (
    <TaskWorkspace
      tasks={tasks}
      currentView={currentView}
      listId={listId}
      lists={lists}
      statuses={statuses}
      headerTitle={currentList.title}
    />
  )
}
