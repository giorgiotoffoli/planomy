import { Card, CardContent, CardHeader } from '../ui/card'
import { useDroppable } from '@dnd-kit/react'
import { List, TaskWithList } from '@/types'
import BoardTaskCard from './BoardTaskCard'

interface BoardColumnProps {
  tasks: TaskWithList[]
  title: string
  statusId: string | null
  lists: List[]
  currentListId: string
}

export default function BoardColumn({
  tasks,
  title,
  statusId,
  lists,
  currentListId,
}: BoardColumnProps) {
  const { ref, isDropTarget } = useDroppable({
    id: statusId ?? 'unassigned',
  })

  const filteredTasks = tasks.filter((tasks) => tasks.status_id === statusId)

  return (
    <div ref={ref}>
      <Card className={isDropTarget ? 'ring-2 ring-blue-500' : ''}>
        <CardHeader className="font-bold">{title}</CardHeader>
        <CardContent>
          <ul>
            {filteredTasks.map((task) => (
              <BoardTaskCard
                key={task.id}
                task={task}
                lists={lists}
                currentListId={currentListId}
              />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
