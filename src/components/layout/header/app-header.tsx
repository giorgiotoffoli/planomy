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

export default function Header({
  headerTitle,
  taskCount,
  rightSlot,
}: {
  headerTitle: string
  taskCount: number
  rightSlot?: ReactNode
}) {
  return (
    <header className="relative z-10 flex h-12 min-h-12 w-full shrink-0 items-center justify-between border-b border-border bg-background">
      <div className="flex min-w-0 items-center px-3">
        <div className="flex items-center gap-2 md:hidden">
          <SidebarTrigger />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
        </div>

        <Breadcrumb>
          <BreadcrumbList className="text-base">
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1 text-lg font-bold font-heading">
                {headerTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <TaskCounter tasksCount={taskCount} />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex shrink-0 items-center gap-2 px-3">
        {rightSlot}
        <AgendaToggle />
      </div>
    </header>
  )
}
