import { Folder } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ListEmoji({
  emoji,
  className,
}: {
  emoji: string | null | undefined
  className?: string
}) {
  if (!emoji) {
    return <Folder aria-hidden className={cn('size-4 text-muted-foreground', className)} />
  }

  return (
    <span aria-hidden className={cn('inline-flex shrink-0 text-base leading-none', className)}>
      {emoji}
    </span>
  )
}
