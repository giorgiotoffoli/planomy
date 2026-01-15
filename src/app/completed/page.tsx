import VisibleTaskList from '@/components/tasks/VisibleTaskList'
import TaskListHeader from '@/components/tasks/TaskListHeader'

export default function CompletedPage() {
  return (
    <>
      <TaskListHeader title="Completed" />
      <VisibleTaskList view={{ kind: 'completed' }} />
    </>
  )
}
