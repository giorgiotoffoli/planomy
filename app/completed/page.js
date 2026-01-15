import VisibleTaskList from '@/components/VisibleTaskList'

export default function CompletedPage() {
  return (
    <>
      <VisibleTaskList view={{ kind: 'completed' }} />
    </>
  )
}
