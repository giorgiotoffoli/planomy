import { Card, CardContent } from '../ui/card'
import { useDroppable } from '@dnd-kit/react'
import { Category, TaskWithList } from '@/types'
import BoardTaskCard from './board-task-card'
import { CategoryHeader } from '@/components/categories/category-controls'

interface BoardColumnProps {
  tasks: TaskWithList[]
  category: Category | null
  categoryIndex?: number
  categoryCount?: number
  onRenameCategory?: (category: Category, title: string) => Promise<void>
  onDeleteCategory?: (category: Category) => Promise<void>
  onMoveCategory?: (
    category: Category,
    direction: 'up' | 'down',
  ) => Promise<void>
  pageScroll?: boolean
}

export default function BoardColumn({
  tasks,
  category,
  categoryIndex,
  categoryCount,
  onRenameCategory,
  onDeleteCategory,
  onMoveCategory,
  pageScroll = false,
}: BoardColumnProps) {
  const { ref, isDropTarget } = useDroppable({
    id: category?.id ?? 'uncategorized',
  })

  const filteredTasks = tasks.filter(
    (task) => task.category_id === (category?.id ?? null),
  )

  return (
    <div ref={ref} className={pageScroll ? undefined : 'h-full'}>
      <Card
        className={`${pageScroll ? '' : 'h-full'} ${isDropTarget ? 'ring-2 ring-blue-500' : ''}`}
      >
        <CategoryHeader
          category={category}
          count={filteredTasks.length}
          categoryIndex={categoryIndex}
          categoryCount={categoryCount}
          onRename={onRenameCategory}
          onDelete={onDeleteCategory}
          onMove={onMoveCategory}
        />
        <CardContent
          className={
            pageScroll ? 'py-4' : 'min-h-0 flex-1 overflow-y-auto py-4'
          }
        >
          <ul>
            {filteredTasks.map((task) => (
              <BoardTaskCard
                key={task.id}
                task={task}
              />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
