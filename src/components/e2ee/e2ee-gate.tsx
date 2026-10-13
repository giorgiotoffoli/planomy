'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import type { StoredKeychain } from './actions'
import { useE2EE } from './e2ee-provider'
import VaultPasswordForm from './vault-password-form'

type E2EEGateProps = {
  children: ReactNode
  initialKeychain: StoredKeychain | null
}

export default function E2EEGate({ children, initialKeychain }: E2EEGateProps) {
  const { isUnlocked, isRestoring } = useE2EE()

  if (isRestoring) {
    return <p role="status" className="p-4 text-sm text-muted-foreground">Restoring your vault…</p>
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
