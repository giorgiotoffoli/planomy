import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar/AppSidebar'

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <div className="flex min-h-screen min-w-0 flex-col">
          <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 selection:bg-blue-500 selection:text-white">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
