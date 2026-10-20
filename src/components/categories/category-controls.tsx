'use client'

import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Category } from '@/types'
import { listColorStyle, type ListColor } from '@/lib/list-colors'
import CategoryColorPicker from './category-color-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type CategoryNameDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  initialValue?: string
  listColor: ListColor
  initialColor?: ListColor | null
  onSubmit: (title: string, color: ListColor | null) => Promise<void>
}

export function CategoryNameDialog({
  open,
  onOpenChange,
  title,
  initialValue = '',
  listColor,
  initialColor = null,
  onSubmit,
}: CategoryNameDialogProps) {
  const [value, setValue] = useState(initialValue)
  const [color, setColor] = useState<ListColor | null>(initialColor)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedValue = value.trim()

    if (!trimmedValue) {
      toast.error('Category name cannot be empty.')
      return
    }

    setIsSaving(true)
    try {
      await onSubmit(trimmedValue, color)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Category was not saved.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Category names are encrypted before they leave your device.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            className="mt-5"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="e.g. Projects"
            maxLength={120}
            disabled={isSaving}
          />
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border/60 px-2 py-1">
            <span className="text-sm text-muted-foreground">Color</span>
            <CategoryColorPicker
              value={color}
              listColor={listColor}
              disabled={isSaving}
              onChange={setColor}
            />
          </div>
          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="animate-spin" />}
              Save category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type CategoryHeaderMenuProps = {
  category: Category
  categoryIndex: number
  categoryCount: number
  listColor: ListColor
  onRename: (category: Category, title: string, color: ListColor | null) => Promise<void>
  onDelete: (category: Category) => Promise<void>
  onMove: (category: Category, direction: 'up' | 'down') => Promise<void>
}

export function CategoryHeaderMenu({
  category,
  categoryIndex,
  categoryCount,
  listColor,
  onRename,
  onDelete,
  onMove,
}: CategoryHeaderMenuProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await onDelete(category)
      setDeleteOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Category was not deleted.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleMove(direction: 'up' | 'down') {
    try {
      await onMove(category, direction)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Category order was not saved.')
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${category.title}`}
            className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <Pencil />
            Rename category
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={categoryIndex === 0}
            onSelect={() => void handleMove('up')}
          >
            <ArrowUp />
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={categoryIndex === categoryCount - 1}
            onSelect={() => void handleMove('down')}
          >
            <ArrowDown />
            Move down
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 />
            Delete category
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CategoryNameDialog
        key={`${renameOpen}-${category.id}-${category.title}`}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename category"
        initialValue={category.title}
        initialColor={category.color ?? null}
        listColor={listColor}
        onSubmit={(title, color) => onRename(category, title, color)}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{category.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Tasks in this category will become Uncategorized. They will not be
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
            >
              {isDeleting && <Loader2 className="animate-spin" />}
              Delete category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

type CategoryHeaderProps = {
  category: Category | null
  count: number
  headingId?: string
  categoryIndex?: number
  categoryCount?: number
  listColor?: ListColor
  onRename?: (category: Category, title: string, color: ListColor | null) => Promise<void>
  onDelete?: (category: Category) => Promise<void>
  onMove?: (category: Category, direction: 'up' | 'down') => Promise<void>
  children?: ReactNode
}

export function CategoryHeader({
  category,
  count,
  headingId,
  categoryIndex,
  categoryCount,
  listColor,
  onRename,
  onDelete,
  onMove,
  children,
}: CategoryHeaderProps) {
  const canManage =
    category &&
    categoryIndex !== undefined &&
    categoryCount !== undefined &&
    onRename &&
    onDelete &&
    onMove
  const hasCustomColor = Boolean(category?.color)

  return (
    <div className="group flex min-h-10 items-center gap-3 border-b border-border/70 px-2 py-2">
      <div className="flex min-w-0 flex-1">
        <div
          className={cn(
            'flex w-fit min-w-0 max-w-full items-center gap-2 rounded-lg px-2 py-1',
            hasCustomColor
              ? 'bg-(--list-color)/10 dark:bg-(--list-color)/15'
              : 'bg-muted/70',
          )}
          style={hasCustomColor ? listColorStyle(category?.color) : undefined}
        >
          <h2
            id={headingId}
            className="min-w-0 truncate text-sm font-semibold tracking-tight"
          >
            {category?.title ?? 'Uncategorized'}
          </h2>
          <span
            className="shrink-0 text-xs tabular-nums text-muted-foreground"
            aria-label={`${count} ${count === 1 ? 'task' : 'tasks'}`}
          >
            {count}
          </span>
        </div>
      </div>
      {children}
      {canManage && (
        <CategoryHeaderMenu
          category={category}
          categoryIndex={categoryIndex}
          categoryCount={categoryCount}
          listColor={listColor!}
          onRename={onRename}
          onDelete={onDelete}
          onMove={onMove}
        />
      )}
    </div>
  )
}

export function AddCategoryButton({
  onCreate,
  listColor,
}: {
  onCreate: (title: string, color: ListColor | null) => Promise<void>
  listColor: ListColor
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Plus />
        Add category
      </Button>
      <CategoryNameDialog
        key={String(open)}
        open={open}
        onOpenChange={setOpen}
        title="Add category"
        listColor={listColor}
        onSubmit={onCreate}
      />
    </>
  )
}
