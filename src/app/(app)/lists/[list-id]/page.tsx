import { getList, getListEvents, getListTasks, getUserLists } from '@/components/lists/queries'
import getCategories from '@/components/boards/queries'
import TaskWorkspace from '@/components/layout/task-workspace'

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

  const [tasks, events, lists, currentList, categories] = await Promise.all([
    getListTasks(listId),
    getListEvents(listId),
    getUserLists(),
    getList(listId),
    getCategories(listId),
  ])

  const currentView = view === 'board' ? 'board' : 'list'

  return (
    <TaskWorkspace
    tasks={tasks}
    events={events}
      currentView={currentView}
      listId={listId}
      lists={lists}
      categories={categories}
      headerTitle={currentList.title}
      headerEmoji={currentList.emoji}
    />
  )
}
