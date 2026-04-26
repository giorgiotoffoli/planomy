import TaskCounter from './TaskCounter'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '../../ui/breadcrumb'
import { Separator } from '../../ui/separator'
import { SidebarTrigger } from '../../ui/sidebar'
import ListBoardToggle from '../ListBoardToggle'

export default function Header({
  headerTitle,
  taskCount,
}: {
  headerTitle: string
  taskCount: number
}) {
  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center border-b bg-background">
      <div className="flex items-center gap-2 px-3">
        <SidebarTrigger />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1 text-lg font-bold">
                {headerTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <TaskCounter tasksCount={taskCount} />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
