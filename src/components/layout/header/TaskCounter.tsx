import { BreadcrumbPage } from '@/components/ui/breadcrumb'
import NumberFlow from '@number-flow/react'

export default function TaskCounter({ tasksCount }: { tasksCount: number }) {
  return (
    <BreadcrumbPage>
      <NumberFlow value={tasksCount} />
    </BreadcrumbPage>
  )
}
