import VisibleTaskList from '@/components/VisibleTaskList'
import TaskListHeader from '@/components/TaskListHeader'

export default function CompletedPage() {
  return (
    <>
      <TaskListHeader title="Completed" />
      <VisibleTaskList view={{ kind: 'completed' }} />
    </>
  )
}
