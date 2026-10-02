import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar/AppSidebar'
import { getUserKeychain } from '@/components/e2ee/actions'
import E2EEGate from '@/components/e2ee/e2ee-gate'
import AgendaProvider from '@/components/agenda/AgendaProvider'
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
          <E2EEGate initialKeychain={keychain}>
            <AgendaProvider>{children}</AgendaProvider>
          </E2EEGate>
        </SidebarInset>
      </SidebarProvider>
    </E2EEProvider>
  )
}
