import VisibleTaskList from '@/components/tasks/VisibleTaskList'
import TaskListHeader from '@/components/tasks/TaskListHeader'

export default function AllPage() {
  return (
    <>
      <TaskListHeader title="All" />
      <VisibleTaskList view={{ kind: 'all' }} />
    </>
  )
}
