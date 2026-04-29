import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar/AppSidebar'
import Header from '@/components/layout/header/Header'
import CreateTaskDialog from '@/components/tasks/create-task/CreateTaskDialog'
import CreateTaskButton from '@/components/tasks/create-task/CreateTaskButton'

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <div className="flex min-h-screen flex-col">
          <main className="flex flex-1 flex-col gap-4 p-4">
            {children}
            <CreateTaskButton />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
