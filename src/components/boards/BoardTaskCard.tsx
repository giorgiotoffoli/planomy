import { useDraggable } from '@dnd-kit/react'
import { Card, CardDescription, CardHeader } from '../ui/card'
import { Task } from '../tasks/types'

interface BoardTaskCard {
  task: Task
}

export default function BoardTaskCard({ task }: BoardTaskCard) {
  const { ref } = useDraggable({
    id: task.id,
  })

  return (
    <Card
      ref={ref}
      className="hover:cursor-grab aria-grabbed:rotate-3 transition-all duration-75"
    >
      <CardHeader>
        <span className="font-bold">{task.title}</span>
        <CardDescription>{task.notes}</CardDescription>
      </CardHeader>
    </Card>
  )
}
