'use client'

import BoardColumn from '@/components/boards/board-column'
import type { Category, TaskWithList } from '@/types'
import { DragDropProvider } from '@dnd-kit/react'
import { useEffect, useMemo, useState } from 'react'
import type { DragDropEvents } from '@dnd-kit/react'
import { toast } from 'sonner'
import { AddCategoryButton } from '@/components/categories/category-controls'

type DragEndEvent = Parameters<DragDropEvents['dragend']>[0]

interface TaskBoardProps {
  tasks: TaskWithList[]
  categories: Category[]
  onTaskCategoryChange: (
    taskId: string,
    categoryId: string | null,
  ) => Promise<void>
  onCreateCategory: (title: string) => Promise<void>
  onRenameCategory: (category: Category, title: string) => Promise<void>
  onDeleteCategory: (category: Category) => Promise<void>
  onMoveCategory: (
    category: Category,
    direction: 'up' | 'down',
  ) => Promise<void>
}

export default function TaskBoard({
  tasks,
  categories,
  onTaskCategoryChange,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  onMoveCategory,
}: TaskBoardProps) {
  const [localTasks, setLocalTasks] = useState(tasks)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setLocalTasks(tasks), 0)
    return () => window.clearTimeout(timeoutId)
  }, [tasks])

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.position - b.position),
    [categories],
  )

  async function handleDragEnd(event: DragEndEvent) {
    if (event.canceled) return

    const taskId = event.operation.source?.id as string | undefined
    const targetId = event.operation.target?.id as string | undefined

    if (!taskId || !targetId) return

    const newCategoryId = targetId === 'uncategorized' ? null : targetId
    if (
      newCategoryId !== null &&
      !sortedCategories.some((category) => category.id === newCategoryId)
    ) {
      return
    }

    const previousTasks = localTasks
    setLocalTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, category_id: newCategoryId } : task,
      ),
    )

    try {
      await onTaskCategoryChange(taskId, newCategoryId)
    } catch (error) {
      setLocalTasks(previousTasks)
      toast.error(error instanceof Error ? error.message : 'Category was not changed.')
    }
  }

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full w-max gap-4 p-4">
          {sortedCategories.map((category, categoryIndex) => (
            <div key={category.id} className="h-full w-80 shrink-0">
              <BoardColumn
                category={category}
                categoryIndex={categoryIndex}
                categoryCount={sortedCategories.length}
                tasks={localTasks}
                onRenameCategory={onRenameCategory}
                onDeleteCategory={onDeleteCategory}
                onMoveCategory={onMoveCategory}
              />
            </div>
          ))}

          {sortedCategories.length > 0 && (
            <div className="h-full w-80 shrink-0">
              <BoardColumn category={null} tasks={localTasks} />
            </div>
          )}

          <div className="flex h-fit w-80 shrink-0 items-start">
            <AddCategoryButton onCreate={onCreateCategory} />
          </div>
        </div>
      </div>
    </DragDropProvider>
  )
}
