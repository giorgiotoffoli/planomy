import { redirect } from 'next/navigation'
import { PlanomyIcon } from '@/icons/planomy-icon'
import { E2EEProvider } from '@/components/e2ee/e2ee-provider'
import OnboardingFlow from '@/components/onboarding/onboarding-flow'
import { getOnboardingState } from '@/components/onboarding/actions'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ google_signup?: string }>
}) {
  const { google_signup: googleSignupParam } = await searchParams
  const googleSignup = googleSignupParam === '1'
  const state = await getOnboardingState()

  if (state.complete && !googleSignup) redirect('/home')

  return (
    <E2EEProvider userId={state.userId}>
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 text-foreground">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] size-[40vw] rounded-full bg-blue-400/15 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] size-[40vw] rounded-full bg-blue-600/10 blur-[100px]" />
        <div className="relative z-10 w-full max-w-xl">
          <div className="mb-6 flex items-center justify-center gap-2 text-xl font-semibold text-foreground">
            <PlanomyIcon size={26} />
            <span>planomy</span>
          </div>
          <section className="rounded-3xl border border-border bg-surface-elevated/90 p-6 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-8">
            <OnboardingFlow
              initialStep={googleSignup ? 'security' : state.step}
              initialKeychain={state.keychain}
              pendingTaskExists={state.pendingTaskExists}
              hasAccountPassword={state.hasAccountPassword}
              googleSignup={googleSignup}
            />
          </section>
        </div>
      </main>
    </E2EEProvider>
  )
}
