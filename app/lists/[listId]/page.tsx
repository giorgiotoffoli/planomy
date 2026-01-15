import VisibleTaskList from '@/components/VisibleTaskList'

export default async function ListPage({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const { listId } = await params
  return <VisibleTaskList view={{ kind: 'list', listId: listId }} />
}
