import VisibleTaskList from '@/components/VisibleTaskList'

export default function ScheduledPage() {
  return (
    <>
      <VisibleTaskList view={{ kind: 'scheduled' }} />
    </>
  )
}
