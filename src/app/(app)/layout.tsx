import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar/app-sidebar'
import E2EEGate from '@/components/e2ee/e2ee-gate'
import AgendaProvider from '@/components/agenda/agenda-provider'
import { E2EEProvider } from '@/components/e2ee/e2ee-provider'
import { getOnboardingState } from '@/components/onboarding/actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const onboarding = await getOnboardingState()

  if (!onboarding.complete) redirect('/onboarding')

  return (
    <E2EEProvider userId={onboarding.userId}>
      <SidebarProvider
        defaultOpen={cookieStore.get('sidebar_state')?.value !== 'false'}
      >
        <AppSidebar />
        <SidebarInset className="min-w-0 p-0">
          <E2EEGate initialKeychain={onboarding.keychain}>
            <AgendaProvider>{children}</AgendaProvider>
          </E2EEGate>
        </SidebarInset>
      </SidebarProvider>
    </E2EEProvider>
  )
}
