import { TaskItem } from '../tasks/task-item/task-item'
import { Category, List, TaskWithList } from '../../types'
import type { ListColor } from '@/lib/list-colors'
import { useSearchParams } from 'next/navigation'
import { useId } from 'react'

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
          <section key={category.id} aria-labelledby={`category-${category.id}`}>
            <CategoryHeader
              category={category}
              count={categoryTasks.length}
              headingId={`category-${category.id}`}
              categoryIndex={categoryIndex}
              categoryCount={sortedCategories.length}
              onRename={handleOnRenameCategory}
              listColor={listColor}
              onDelete={handleOnDeleteCategory}
              onMove={handleOnMoveCategory}
            />
            {renderTasks(categoryTasks)}
          </section>
        )
      })}

      <section aria-labelledby="category-uncategorized">
        <CategoryHeader
          category={null}
          count={localTasks.filter((task) => task.category_id === null).length}
          headingId="category-uncategorized"
        />
        {renderTasks(localTasks.filter((task) => task.category_id === null))}
      </section>

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
