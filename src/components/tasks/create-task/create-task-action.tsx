import type { Category, List } from '@/types'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import CreateTaskDialog from './create-task-dialog'

type CreateTaskActionProps = {
  lists: List[]
  categories?: Category[]
  listId: string | null
  categoryId?: string | null
  className?: string
  compact?: boolean
  interactive?: boolean
}

/**
 * Shared Add task trigger used by both the full Home toolbar and its compact
 * collapsed header. The dialog and create behavior stay in one place.
 */
export default function CreateTaskAction({
  lists,
  categories,
  listId,
  categoryId,
  className,
  compact = false,
  interactive = true,
}: CreateTaskActionProps) {
  return (
    <CreateTaskDialog
      lists={lists}
      categories={categories}
      listId={listId}
      categoryId={categoryId}
    >
      <Button
        type="button"
        aria-label="Add task"
        title="Add task"
        disabled={!interactive}
        tabIndex={interactive ? 0 : -1}
        className={cn(
          'rounded-xl bg-primary hover:bg-accent-hover active:bg-accent-active',
          compact ? 'h-8 px-2 sm:px-3' : 'h-10 shrink-0 px-3 sm:px-4',
          className,
        )}
      >
        <Plus aria-hidden="true" />
        <span
          className={cn(
            'overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-none',
            compact
              ? 'hidden max-w-0 -translate-x-1 opacity-0 sm:inline'
              : 'max-w-24 opacity-100',
            compact && interactive && 'sm:max-w-24 sm:translate-x-0 sm:opacity-100',
          )}
        >
          Add task
        </span>
      </Button>
    </CreateTaskDialog>
  )
}
