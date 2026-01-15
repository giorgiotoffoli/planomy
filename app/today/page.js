import VisibleTaskList from '@/components/VisibleTaskList'

export default function TodayPage() {
  return (
    <>
      <VisibleTaskList view={{ kind: 'today' }} />
    </>
  )
}
