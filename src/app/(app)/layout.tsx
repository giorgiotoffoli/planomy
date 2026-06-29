import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar/AppSidebar'
import { getUserKeychain } from '@/components/e2ee/actions'
import E2EEGate from '@/components/e2ee/e2ee-gate'
import { E2EEProvider } from '@/components/e2ee/e2ee-provider'

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const keychain = await getUserKeychain()
  return (
    <E2EEProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <div className="flex min-h-screen min-w-0 flex-col">
            <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 selection:bg-blue-500 selection:text-white">
              <E2EEGate initialKeychain={keychain}>{children}</E2EEGate>
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </E2EEProvider>
  )
}
