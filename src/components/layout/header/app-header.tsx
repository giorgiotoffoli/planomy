import AgendaToggle from '@/components/agenda/agenda-toggle'
import TaskCounter from './task-counter'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '../../ui/breadcrumb'
import { Separator } from '../../ui/separator'
import { SidebarTrigger } from '../../ui/sidebar'
import type { ReactNode } from 'react'
import { ListEmoji } from '@/components/lists/list-emoji'

export default function Header({
  headerTitle,
  taskCount,
  rightSlot,
  headerEmoji,
}: {
  headerTitle: string
  taskCount: number
  rightSlot?: ReactNode
  headerEmoji?: string | null
}) {
  return (
    <header className="relative z-10 flex h-12 min-h-12 w-full shrink-0 items-center justify-between border-b border-border bg-background">
      <div className="flex min-w-0 flex-1 items-center px-3">
        <div className="flex items-center gap-2 md:hidden">
          <SidebarTrigger />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
        </div>

        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="min-w-0 flex-nowrap text-base">
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="min-w-0 line-clamp-1 text-lg font-bold font-heading">
                <span className="flex min-w-0 items-center gap-1.5">
                  {headerEmoji !== undefined && <ListEmoji emoji={headerEmoji} />}
                  <span className="truncate">{headerTitle}</span>
                </span>
              </BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <TaskCounter tasksCount={taskCount} />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex shrink-0 items-center gap-1 px-2 sm:gap-2 sm:px-3">
        {rightSlot}
        <AgendaToggle />
      </div>
    </header>
  )
}
