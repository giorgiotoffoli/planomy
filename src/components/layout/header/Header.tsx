import TaskCounter from './TaskCounter'
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
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b bg-background">
      <div className="flex min-w-0 items-center gap-2 px-3">
        <SidebarTrigger />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />

        <Breadcrumb>
          <BreadcrumbList>
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

      {rightSlot && <div className="px-3">{rightSlot}</div>}
    </header>
  )
}
