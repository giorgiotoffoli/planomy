import TaskListHeader from '@/components/tasks/TaskListHeader'
import VisibleTaskList from '@/components/tasks/VisibleTaskList'

export default async function ListPage({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const { listId } = await params

  return (
    <>
      <TaskListHeader listId={listId} />
      <VisibleTaskList view={{ kind: 'list', listId: listId }} />
    </>
  )
}
