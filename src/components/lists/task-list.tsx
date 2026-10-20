import { TaskItem } from '../tasks/task-item/task-item'
import { Category, List, TaskWithList } from '../../types'
import type { ListColor } from '@/lib/list-colors'
import { useSearchParams } from 'next/navigation'
import { useId, type ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import {
  AddCategoryButton,
  CategoryHeader,
} from '@/components/categories/category-controls'

interface TaskListProps {
  localTasks: TaskWithList[]
  localLists: List[]
  currentListId: string | null
  handleOnComplete: (taskId: string, isCompleted: boolean) => void
  handleOnRename: (taskId: string, newName: string) => void
  handleOnNotesChange: (taskId: string, notes: string) => void
  handleOnDueDateChange: (taskId: string, newDueDate: string) => void
  handleOnDelete: (taskId: string) => void
  pathName: string
  handleOnReorder: (activeId: string, overId: string) => void
  canReorder: boolean
  categories?: Category[]
  listColor?: ListColor
  handleOnChangeCategory?: (
    taskId: string,
    categoryId: string | null,
  ) => Promise<void>
  handleOnCreateCategory?: (title: string, color: ListColor | null) => Promise<void>
  handleOnRenameCategory?: (category: Category, title: string, color: ListColor | null) => Promise<void>
  handleOnDeleteCategory?: (category: Category) => Promise<void>
  handleOnMoveCategory?: (
    category: Category,
    direction: 'up' | 'down',
  ) => Promise<void>
  pageScroll?: boolean
}

interface TaskCategorySectionProps {
  category: Category | null
  count: number
  headingId: string
  categoryIndex?: number
  categoryCount?: number
  listColor?: ListColor
  onRename?: (category: Category, title: string, color: ListColor | null) => Promise<void>
  onDelete?: (category: Category) => Promise<void>
  onMove?: (category: Category, direction: 'up' | 'down') => Promise<void>
  scope: string
  canDrop: boolean
  children: ReactNode
}

function TaskCategorySection({
  category,
  count,
  headingId,
  categoryIndex,
  categoryCount,
  listColor,
  onRename,
  onDelete,
  onMove,
  scope,
  canDrop,
  children,
}: TaskCategorySectionProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `task-category:${category?.id ?? 'uncategorized'}`,
    disabled: !canDrop,
    data: {
      kind: 'task-category',
      categoryId: category?.id ?? null,
      scope,
    },
  })

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={cn(
        'min-h-16 rounded-lg transition-colors',
        isOver && 'bg-primary/5 ring-2 ring-primary/30',
      )}
    >
      <CategoryHeader
        category={category}
        count={count}
        headingId={headingId}
        categoryIndex={categoryIndex}
        categoryCount={categoryCount}
        onRename={onRename}
        listColor={listColor}
        onDelete={onDelete}
        onMove={onMove}
      />
      {children}
    </section>
  )
}

export default function TaskList({
  localTasks,
  localLists,
  currentListId,
  handleOnComplete,
  handleOnRename,
  handleOnDueDateChange,
  handleOnNotesChange,
  handleOnDelete,
  pathName,
  handleOnReorder,
  canReorder,
  categories,
  listColor,
  handleOnChangeCategory,
  handleOnCreateCategory,
  handleOnRenameCategory,
  handleOnDeleteCategory,
  handleOnMoveCategory,
  pageScroll = false,
}: TaskListProps) {
  const scope = useId()

  const shouldHideCompleted = pathName !== '/completed'
  const isInbox = pathName === '/inbox'
  const searchParams = useSearchParams()
  const taskId = searchParams.get('task')

  const sortedCategories = categories
    ? [...categories].sort((a, b) => a.position - b.position)
    : []
  const canManageCategories = Boolean(
    currentListId &&
      categories &&
      handleOnCreateCategory &&
      handleOnRenameCategory &&
      handleOnDeleteCategory &&
      handleOnMoveCategory,
  )
  const showCategorySections = canManageCategories && sortedCategories.length > 0

  function renderTasks(tasks: TaskWithList[]) {
    return (
      <ul>
        {tasks.map((task) => (
          <TaskItem
            highlighted={taskId === task.id}
            key={task.id}
            task={task}
            lists={localLists}
            currentListId={currentListId}
            handleOnComplete={handleOnComplete}
            handleOnRename={handleOnRename}
            handleOnDueDateChange={handleOnDueDateChange}
            handleOnNotesChange={handleOnNotesChange}
            handleOnDelete={handleOnDelete}
            shouldHideCompleted={shouldHideCompleted}
            isInbox={isInbox}
            canReorder={canReorder}
            dragScope={canReorder ? scope : undefined}
            handleOnReorder={handleOnReorder}
            categories={categories}
            handleOnChangeCategory={handleOnChangeCategory}
          />
        ))}
      </ul>
    )
  }

  const tasklist = showCategorySections ? (
    <div className="flex flex-col gap-7">
      {sortedCategories.map((category, categoryIndex) => {
        const categoryTasks = localTasks.filter(
          (task) => task.category_id === category.id,
        )

        return (
          <TaskCategorySection
            key={category.id}
            category={category}
            count={categoryTasks.length}
            headingId={`category-${category.id}`}
            categoryIndex={categoryIndex}
            categoryCount={sortedCategories.length}
            onRename={handleOnRenameCategory}
            listColor={listColor}
            onDelete={handleOnDeleteCategory}
            onMove={handleOnMoveCategory}
            scope={scope}
            canDrop={canReorder && Boolean(handleOnChangeCategory)}
          >
            {renderTasks(categoryTasks)}
          </TaskCategorySection>
        )
      })}

      <TaskCategorySection
        category={null}
        count={localTasks.filter((task) => task.category_id === null).length}
        headingId="category-uncategorized"
        scope={scope}
        canDrop={canReorder && Boolean(handleOnChangeCategory)}
      >
        {renderTasks(localTasks.filter((task) => task.category_id === null))}
      </TaskCategorySection>

      <AddCategoryButton onCreate={handleOnCreateCategory!} listColor={listColor!} />
    </div>
  ) : canManageCategories ? (
    <div className="flex flex-col gap-4">
      {renderTasks(localTasks)}
      <AddCategoryButton onCreate={handleOnCreateCategory!} listColor={listColor!} />
    </div>
  ) : (
    renderTasks(localTasks)
  )

  return (
    <div className={`flex flex-col sm:w-full ${pageScroll ? '' : 'h-full'}`}>
      <div
        className={
          pageScroll ? 'pb-16' : 'flex-1 overflow-y-auto scroll-smooth pb-16'
        }
      >
        <SortableContext
          items={localTasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
          disabled={!canReorder}
        >
          {tasklist}
        </SortableContext>
      </div>
    </div>
  )
}
