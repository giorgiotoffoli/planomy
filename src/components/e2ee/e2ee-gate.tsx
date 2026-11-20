'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import type { StoredKeychain } from './actions'
import { useE2EE } from './e2ee-provider'
import VaultPasswordForm from './vault-password-form'
import { Skeleton } from '@/components/ui/skeleton'

type E2EEGateProps = {
  children: ReactNode
  initialKeychain: StoredKeychain | null
}

export default function E2EEGate({ children, initialKeychain }: E2EEGateProps) {
  const { isUnlocked, isRestoring } = useE2EE()

  if (isRestoring) {
    return (
      <div
        role="status"
        aria-label="Loading your workspace"
        aria-busy="true"
        className="fixed inset-0 z-50 flex min-h-svh bg-background"
      >
        <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 md:flex">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-4/5" />
          </div>
          <div className="space-y-3 pt-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-5/6" />
            <Skeleton className="h-8 w-4/5" />
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col p-4 sm:p-6">
          <div className="flex h-12 items-center justify-between">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="size-9 rounded-xl" />
          </div>
          <div className="mt-6 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
            <Skeleton className="hidden h-full min-h-72 w-full rounded-2xl lg:block" />
          </div>
        </main>
      </div>
    )
  }

  if (isUnlocked) {
    return <>{children}</>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-6 shadow-xl shadow-black/20">
        <VaultPasswordForm initialKeychain={initialKeychain} />
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Cannot unlock your vault?{' '}
          <Link
            href="/settings"
            className="font-medium text-primary hover:text-primary/80"
          >
            Manage your account
          </Link>
        </p>
      </div>
    </div>
  )
}
