import VisibleTaskList from '@/components/VisibleTaskList'
import TaskListHeader from '@/components/TaskListHeader'

export default function ScheduledPage() {
  return (
    <>
      <TaskListHeader title="Scheduled" />
      <VisibleTaskList view={{ kind: 'scheduled' }} />
    </>
  )
}
