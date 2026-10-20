'use client'

import BoardColumn from '@/components/boards/board-column'
import type { Category, TaskWithList } from '@/types'
import type { ListColor } from '@/lib/list-colors'
import { DragDropProvider } from '@dnd-kit/react'
import { useEffect, useMemo, useState } from 'react'
import type { DragDropEvents } from '@dnd-kit/react'
import { toast } from 'sonner'
import { AddCategoryButton } from '@/components/categories/category-controls'

type DragEndEvent = Parameters<DragDropEvents['dragend']>[0]

interface TaskBoardProps {
  tasks: TaskWithList[]
  categories: Category[]
  listColor: ListColor
  onTaskCategoryChange: (
    taskId: string,
    categoryId: string | null,
  ) => Promise<void>
  onCreateCategory: (title: string, color: ListColor | null) => Promise<void>
  onRenameCategory: (category: Category, title: string, color: ListColor | null) => Promise<void>
  onDeleteCategory: (category: Category) => Promise<void>
  onMoveCategory: (
    category: Category,
    direction: 'up' | 'down',
  ) => Promise<void>
  pageScroll?: boolean
}

export default function TaskBoard({
  tasks,
  categories,
  listColor,
  onTaskCategoryChange,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  onMoveCategory,
  pageScroll = false,
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
      <div
        className={
          pageScroll
            ? 'min-w-0 overflow-x-auto pb-4'
            : 'min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden'
        }
      >
        <div
          className={
            pageScroll ? 'flex w-max gap-4 p-4' : 'flex h-full w-max gap-4 p-4'
          }
        >
          {sortedCategories.map((category, categoryIndex) => (
            <div
              key={category.id}
              className={`${pageScroll ? '' : 'h-full'} w-80 shrink-0`}
            >
              <BoardColumn
                category={category}
                categoryIndex={categoryIndex}
                categoryCount={sortedCategories.length}
                tasks={localTasks}
                onRenameCategory={onRenameCategory}
                listColor={listColor}
                onDeleteCategory={onDeleteCategory}
                onMoveCategory={onMoveCategory}
                pageScroll={pageScroll}
              />
            </div>
          ))}

          {sortedCategories.length > 0 && (
            <div className={`${pageScroll ? '' : 'h-full'} w-80 shrink-0`}>
              <BoardColumn
                category={null}
                tasks={localTasks}
                listColor={listColor}
                pageScroll={pageScroll}
              />
            </div>
          )}

          <div className="flex h-fit w-80 shrink-0 items-start">
            <AddCategoryButton onCreate={onCreateCategory} listColor={listColor} />
          </div>
        </div>
      </div>
    </DragDropProvider>
  )
}
