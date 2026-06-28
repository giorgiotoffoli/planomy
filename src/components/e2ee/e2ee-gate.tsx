'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { StoredKeychain } from './actions'
import { saveUserKeychain } from './actions'
import { createWrappedMasterKey, unwrapMasterKey } from '@/lib/crypto/e2ee'
import { useE2EE } from './e2ee-provider'

type E2EEGateProps = {
  children: ReactNode
  initialKeychain: StoredKeychain | null
}

export default function E2EEGate({ children, initialKeychain }: E2EEGateProps) {
  const hasKeychain = Boolean(initialKeychain)

  const [masterPassword, setMasterPassword] = useState('')
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)

  const { setMasterKey } = useE2EE()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!masterPassword) {
      toast.error('Master password do not match.')
      return
    }

    setIsBusy(true)

    try {
      if (hasKeychain) {
        // Unlock mode
        if (!initialKeychain) {
          throw new Error('No keychain found for this account')
        }
        const masterKey = await unwrapMasterKey(masterPassword, initialKeychain)

        setMasterKey(masterKey)
        setIsUnlocked(true)
        toast.success('Encyrption unlocked!')
      } else {
        // Setup mode
        const { masterKey, payload } =
          await createWrappedMasterKey(masterPassword)
        await saveUserKeychain(payload)

        setMasterKey(masterKey)
        setIsUnlocked(true)
        toast.success('Encryption set up successfuly.')
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Something went wrong with encryption.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  if (isUnlocked) {
    return <>{children}</>
  }

  return (
    <>
      {children}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        >
          <div className="mb-3 flex items-center gap-2">
            <p className="text-sm font-medium text-blue-600">
              End-to-end encryption
            </p>

            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold tracking-wide text-amber-700 ring-1 ring-amber-200">
              NEW
            </span>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900">
            {hasKeychain ? 'Unlock your data' : 'Set up encryption'}
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            {hasKeychain
              ? 'Enter your master password to unlock your Planomy data on this device.'
              : 'Create a master password. Planomy will use it to protect your encryption key.'}
          </p>

          {!hasKeychain && (
            <div className="mt-5 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-amber-950">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

                <div>
                  <p className="font-semibold">
                    Save this password somewhere safe.
                  </p>

                  <p className="mt-1 text-sm leading-6">
                    Planomy cannot recover your master password under any
                    circumstance. If you forget it, your encrypted data cannot
                    be unlocked.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Master password
            </label>

            <input
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Enter master password"
            />
          </div>

          {!hasKeychain && (
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Confirm master password
              </label>

              <input
                type="password"
                value={confirmMasterPassword}
                onChange={(event) =>
                  setConfirmMasterPassword(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Confirm master password"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {isBusy
              ? hasKeychain
                ? 'Unlocking...'
                : 'Creating key...'
              : hasKeychain
                ? 'Unlock'
                : 'Create encryption key'}
          </button>
        </form>
      </div>
    </>
  )
}
