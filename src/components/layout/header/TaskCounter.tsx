import NumberFlow from '@number-flow/react'

export default function TaskCounter({ tasksCount }: { tasksCount: number }) {
  return (
    <NumberFlow
      value={tasksCount}
      className="text-lg fixed top-7 right-13 z-50"
    />
  )
}
