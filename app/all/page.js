import VisibleTaskList from '@/components/VisibleTaskList'
import TaskListHeader from '@/components/TaskListHeader'

export default function AllPage() {
  return (
    <>
      <TaskListHeader title="All" />
      <VisibleTaskList view={{ kind: 'all' }} />
    </>
  )
}
