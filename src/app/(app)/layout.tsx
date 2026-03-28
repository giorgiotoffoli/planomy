import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar/AppSidebar'
import Header from '@/components/layout/header/Header'

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
          <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
