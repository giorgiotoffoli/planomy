import VisibleTaskList from '@/components/VisibleTaskList'

export default function AllPage() {
  return (
    <>
      <VisibleTaskList view={{ kind: 'all' }} />
    </>
  )
}
