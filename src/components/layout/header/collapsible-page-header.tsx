'use client'

import { useRef, type ReactNode, type RefObject } from 'react'
import Header from './app-header'
import { useCollapsiblePageHeader } from '@/hooks/use-collapsible-page-header'
import { cn } from '@/lib/utils'

type CollapsiblePageHeaderProps = {
  children: ReactNode
  headerTitle: string
  taskCount: number
  scrollRootRef: RefObject<HTMLElement | null>
  rightSlot?: ReactNode | ((isCollapsed: boolean) => ReactNode)
  headerEmoji?: string | null
}

/**
 * A page-owned large header that turns into the shared compact app header as
 * it leaves the page's scroll viewport.
 *
 * The zero-height sticky wrapper keeps the compact header out of normal flow,
 * so revealing it cannot move the task content underneath it.
 */
export default function CollapsiblePageHeader({
  children,
  headerTitle,
  taskCount,
  scrollRootRef,
  rightSlot,
  headerEmoji,
}: CollapsiblePageHeaderProps) {
  const largeHeaderRef = useRef<HTMLDivElement>(null)
  const isCollapsed = useCollapsiblePageHeader({
    headerRef: largeHeaderRef,
    scrollRootRef,
  })
  const resolvedRightSlot =
    typeof rightSlot === 'function' ? rightSlot(isCollapsed) : rightSlot

  return (
    <>
      <div className="pointer-events-none sticky top-0 z-30 -mx-4 -mb-12 h-12 sm:-top-8 sm:-mx-6 lg:-mx-8">
        <div
          aria-hidden={!isCollapsed}
          inert={!isCollapsed}
          className={cn(
            'origin-top transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none',
            isCollapsed
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-2 opacity-0',
          )}
        >
          <Header
            headerTitle={headerTitle}
            taskCount={taskCount}
            headerEmoji={headerEmoji}
            rightSlot={resolvedRightSlot}
          />
        </div>
      </div>

      <div ref={largeHeaderRef}>{children}</div>
    </>
  )
}
