import VisibleTaskList from '@/components/tasks/VisibleTaskList'
import TaskListHeader from '@/components/tasks/TaskListHeader'

export default function ScheduledPage() {
  return (
    <>
      <TaskListHeader title="Scheduled" />
      <VisibleTaskList view={{ kind: 'scheduled' }} />
    </>
  )
}
