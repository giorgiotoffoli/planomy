import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { E2EEProvider } from '@/components/e2ee/e2ee-provider'
import { getUserKeychain } from '@/components/e2ee/actions'
import SettingsClient from '@/components/settings/settings-client'
import { Button } from '@/components/ui/button'
import { PlanomyIcon } from '@/icons/planomy-icon'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Settings · Planomy',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user?.email) redirect('/auth')

  const keychain = await getUserKeychain()

  return (
    <E2EEProvider userId={user.id}>
      <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:py-12">
        <div className="mx-auto w-full max-w-2xl">
          <header className="mb-8 flex items-center justify-between gap-4">
            <Link
              href="/home"
              className="flex items-center gap-2 font-semibold"
            >
              <PlanomyIcon size={26} />
              <span className="font-heading text-xl">planomy</span>
            </Link>
            <Button variant="outline" size="sm" asChild>
              <Link href="/home">
                <ArrowLeft /> Back to workspace
              </Link>
            </Button>
          </header>

          <div className="mb-7">
            <p className="text-sm font-medium text-primary">Your account</p>
            <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
              Settings
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
          </div>

          <SettingsClient initialKeychain={keychain} />
        </div>
      </main>
    </E2EEProvider>
  )
}
