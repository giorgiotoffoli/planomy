import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import type { HomeDataSource } from '@/features/home/model'
import { createSupabaseHomeSource, fetchNativeVaultKeychain, unlockNativeVault } from '@/features/home/supabase-source'
import { biometricVaultAvailable, enableBiometricVault, isBiometricVaultEnabled, readBiometricVault, removeBiometricVault } from '@/lib/vault/biometric-vault'
import { authErrorMessage, OTP_LENGTH } from './errors'
import {
  initialAuthState,
  reduceAuthState,
  type AuthState,
  type AuthStateEvent,
  type AuthUser,
} from './state'
import {
  nativeSessionStorage,
  nativeSupabaseClient,
  nativeSupabaseConfigurationError,
} from '@/lib/supabase/client'

export type AuthActionResult =
  | { ok: true }
  | { ok: false; error: string }

type AuthContextValue = {
  state: AuthState
  homeSource: HomeDataSource | null
  notice: string | null
  clearNotice: () => void
  signInWithPassword: (email: string, password: string) => Promise<AuthActionResult>
  requestEmailCode: (email: string) => Promise<AuthActionResult>
  verifyEmailCode: (email: string, token: string) => Promise<AuthActionResult>
  biometricAvailable: boolean
  biometricEnabled: boolean
  unlockVault: (password: string, enableBiometrics?: boolean) => Promise<AuthActionResult>
  unlockWithBiometrics: () => Promise<AuthActionResult>
  disableBiometrics: () => Promise<AuthActionResult>
  lockVault: () => void
  signOut: () => Promise<AuthActionResult>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const SESSION_STORAGE_ERROR = 'Could not safely save the sign-in session. Try again.'
const SIGN_OUT_STORAGE_ERROR = 'Could not securely clear this session. Try signing out again.'
const providerInitialState: AuthState = nativeSupabaseClient
  ? initialAuthState
  : { status: 'unauthenticated' }

function toAuthUser(user: User | null | undefined): AuthUser | null {
  return user ? { id: user.id, email: user.email ?? null } : null
}

function isMissingSessionError(error: { name?: string; message?: string }) {
  return error.name === 'AuthSessionMissingError' ||
    error.message?.toLowerCase().includes('auth session missing') === true
}

function isAuthenticated(state: AuthState) {
  return state.status === 'authenticated-but-locked' || state.status === 'unlocked'
}

function validEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value)
}

async function clearLocalSession() {
  if (nativeSupabaseClient) {
    let firstError: unknown = null
    try {
      const { error } = await nativeSupabaseClient.auth.signOut({ scope: 'local' })
      if (error && !isMissingSessionError(error)) firstError = error
    } catch (error) {
      firstError = error
    }

    // Explicitly remove both secure-store banks even if the SDK's first
    // cleanup failed. Retry local sign-out after storage recovers so its
    // in-memory state is cleared as well.
    if (firstError) await nativeSessionStorage.clear()
    if (firstError) {
      const retry = await nativeSupabaseClient.auth.signOut({ scope: 'local' })
      if (retry.error && !isMissingSessionError(retry.error)) throw retry.error
    }
  }
  await nativeSessionStorage.clear()
}

async function verifySavedSession(session: Session) {
  await nativeSessionStorage.assertSession(session)
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reduceAuthState, providerInitialState)
  const [notice, setNotice] = useState<string | null>(nativeSupabaseConfigurationError)
  const [homeSource, setHomeSource] = useState<HomeDataSource | null>(null)
  const homeSourceRef = useRef<HomeDataSource | null>(null)
  const unlockInProgress = useRef(false)
  const unlockGeneration = useRef(0)
  const stateRef = useRef<AuthState>(providerInitialState)
  const manualSignOut = useRef(false)
  const [biometricUserId, setBiometricUserId] = useState<string | null>(null)
  const biometricUserIdRef = useRef<string | null>(null)
  const biometricSettingsGeneration = useRef(0)
  const currentUserId = isAuthenticated(state) ? state.user.id : null
  const biometricAvailable = biometricVaultAvailable()
  const biometricEnabled = Boolean(currentUserId && biometricUserId === currentUserId)

  const apply = useCallback((event: AuthStateEvent) => {
    if (event.type === 'signed-out' || event.type === 'signed-in' || event.type === 'vault-locked' ||
      (event.type === 'session-updated' && isAuthenticated(stateRef.current) && stateRef.current.user.id !== event.user.id)) {
      unlockGeneration.current += 1
    }
    stateRef.current = reduceAuthState(stateRef.current, event)
    dispatch(event)
  }, [])

  useEffect(() => {
    if (!currentUserId) return
    let active = true
    const generation = biometricSettingsGeneration.current
    void isBiometricVaultEnabled(currentUserId).then((enabled) => {
      if (!active || generation !== biometricSettingsGeneration.current) return
      biometricUserIdRef.current = enabled ? currentUserId : null
      setBiometricUserId(enabled ? currentUserId : null)
    }).catch(() => {})
    return () => { active = false }
  }, [currentUserId])

  const clearHomeSource = useCallback(() => {
    homeSourceRef.current?.dispose()
    homeSourceRef.current = null
    setHomeSource(null)
  }, [])

  useEffect(() => {
    const client = nativeSupabaseClient
    if (!client) return
    const configuredClient: SupabaseClient = client

    let disposed = false
    let initialized = false
    let authEvents = 0
    const { data: { subscription } } = configuredClient.auth.onAuthStateChange((event, session) => {
      if (disposed) return
      if (event === 'INITIAL_SESSION') {
        if (initialized) return
        initialized = true
        apply({ type: 'restored', user: toAuthUser(session?.user) })
        return
      }
      if (manualSignOut.current) return

      authEvents += 1
      if (event === 'SIGNED_OUT') {
        const previous = stateRef.current
        if (isAuthenticated(previous)) void removeBiometricVault(previous.user.id).catch(() => {})
        biometricSettingsGeneration.current += 1
        biometricUserIdRef.current = null
        setBiometricUserId(null)
        clearHomeSource()
        const message = isAuthenticated(stateRef.current)
          ? 'Your session ended. Sign in again to continue.'
          : undefined
        apply({ type: 'signed-out', message })
        if (message) setNotice(null)
        return
      }
      if (!session) return

      const user = toAuthUser(session.user)
      if (!user) return
      if (event === 'SIGNED_IN') {
        const previousUserId = isAuthenticated(stateRef.current) ? stateRef.current.user.id : null
        if (stateRef.current.status === 'unlocked' || (previousUserId && previousUserId !== user.id)) clearHomeSource()
        if (previousUserId && previousUserId !== user.id) {
          biometricSettingsGeneration.current += 1
          biometricUserIdRef.current = null
          setBiometricUserId(null)
          void removeBiometricVault(previousUserId).catch(() => {})
        }
        setNotice(null)
        apply({ type: 'signed-in', user })
      } else {
        const previousUserId = isAuthenticated(stateRef.current) ? stateRef.current.user.id : null
        if (previousUserId && previousUserId !== user.id) {
          clearHomeSource()
          biometricSettingsGeneration.current += 1
          biometricUserIdRef.current = null
          setBiometricUserId(null)
          void removeBiometricVault(previousUserId).catch(() => {})
        }
        apply({ type: 'session-updated', user })
      }
    })

    void configuredClient.auth.getSession().then(({ data, error }) => {
      if (disposed || initialized || authEvents > 0) return
      if (error) throw error
      initialized = true
      apply({ type: 'restored', user: toAuthUser(data.session?.user) })
    }).catch(() => {
      if (disposed || initialized || authEvents > 0) return
      initialized = true
      setNotice('The saved session could not be restored. Sign in again.')
      apply({ type: 'restored', user: null })
    })

    function updateRefreshState(nextState: AppStateStatus | null | undefined) {
      const current = stateRef.current
      if (nextState === 'background' && unlockInProgress.current) unlockGeneration.current += 1
      if (nextState === 'background' && current.status === 'unlocked' && biometricUserIdRef.current === current.user.id) {
        clearHomeSource()
        apply({ type: 'vault-locked' })
      }
      const refresh = nextState === 'active'
        ? configuredClient.auth.startAutoRefresh()
        : configuredClient.auth.stopAutoRefresh()
      void Promise.resolve(refresh).catch(() => {})
    }

    updateRefreshState(AppState.currentState === 'active' ? 'active' : 'background')
    const appStateSubscription = AppState.addEventListener('change', updateRefreshState)

    return () => {
      disposed = true
      subscription.unsubscribe()
      appStateSubscription.remove()
      void Promise.resolve(configuredClient.auth.stopAutoRefresh()).catch(() => {})
    }
  }, [apply, clearHomeSource])

  const persistSuccessfulSession = useCallback(async (session: Session): Promise<AuthActionResult> => {
    try {
      await verifySavedSession(session)
      return { ok: true }
    } catch {
      manualSignOut.current = true
      try {
        await clearLocalSession()
        apply({ type: 'signed-out' })
        setNotice(SESSION_STORAGE_ERROR)
      } catch {
        setNotice(SESSION_STORAGE_ERROR)
      } finally {
        manualSignOut.current = false
      }
      return { ok: false, error: SESSION_STORAGE_ERROR }
    }
  }, [apply])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const client = nativeSupabaseClient
    if (!client) {
      return { ok: false, error: nativeSupabaseConfigurationError ?? 'Supabase is not configured.' } as const
    }
    if (stateRef.current.status !== 'unauthenticated') {
      return { ok: false, error: 'Sign out of the current account before switching accounts.' } as const
    }
    const normalizedEmail = email.trim()
    if (!validEmail(normalizedEmail) || !password) {
      return { ok: false, error: 'Enter a valid email and password.' } as const
    }

    setNotice(null)
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })
      if (error) return { ok: false, error: authErrorMessage(error, 'password') } as const
      if (!data.session) {
        return { ok: false, error: 'No session was returned. Check your account and try again.' } as const
      }
      return await persistSuccessfulSession(data.session)
    } catch (error) {
      return { ok: false, error: authErrorMessage(error, 'password') } as const
    }
  }, [persistSuccessfulSession])

  const requestEmailCode = useCallback(async (email: string) => {
    const client = nativeSupabaseClient
    if (!client) {
      return { ok: false, error: nativeSupabaseConfigurationError ?? 'Supabase is not configured.' } as const
    }
    const normalizedEmail = email.trim()
    if (!validEmail(normalizedEmail)) {
      return { ok: false, error: 'Enter a valid email address.' } as const
    }

    setNotice(null)
    try {
      const { error } = await client.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false },
      })
      if (error) return { ok: false, error: authErrorMessage(error, 'otp-request') } as const
      return { ok: true } as const
    } catch (error) {
      return { ok: false, error: authErrorMessage(error, 'otp-request') } as const
    }
  }, [])

  const verifyEmailCode = useCallback(async (email: string, token: string) => {
    const client = nativeSupabaseClient
    if (!client) {
      return { ok: false, error: nativeSupabaseConfigurationError ?? 'Supabase is not configured.' } as const
    }
    const normalizedEmail = email.trim()
    if (!validEmail(normalizedEmail) || token.length !== OTP_LENGTH || !/^\d+$/.test(token)) {
      return { ok: false, error: `Enter the 8-digit code sent to ${normalizedEmail}.` } as const
    }

    setNotice(null)
    try {
      const { data, error } = await client.auth.verifyOtp({
        email: normalizedEmail,
        token,
        type: 'email',
      })
      if (error) return { ok: false, error: authErrorMessage(error, 'otp-verify') } as const
      if (!data.session) {
        return { ok: false, error: 'No session was returned. Request a new code and try again.' } as const
      }
      return await persistSuccessfulSession(data.session)
    } catch (error) {
      return { ok: false, error: authErrorMessage(error, 'otp-verify') } as const
    }
  }, [persistSuccessfulSession])

  const unlock = useCallback(async (password: string | null, enableBiometrics = false): Promise<AuthActionResult> => {
    if (unlockInProgress.current) return { ok: false, error: 'Unlock is already in progress.' }
    const currentState = stateRef.current
    if (currentState.status !== 'authenticated-but-locked') {
      return { ok: false, error: 'Sign in before unlocking your vault.' }
    }
    const client = nativeSupabaseClient
    if (!client) {
      return { ok: false, error: nativeSupabaseConfigurationError ?? 'Supabase is not configured.' }
    }
    unlockInProgress.current = true
    const generation = unlockGeneration.current
    if (enableBiometrics) biometricSettingsGeneration.current += 1
    setNotice(null)
    let masterKey: Uint8Array | null = null
    let enrolled = false
    try {
      const { data, error } = await client.auth.getUser()
      if (error) throw error
      if (!data.user || data.user.id !== currentState.user.id) {
        clearHomeSource()
        apply({ type: 'signed-out' })
        return { ok: false, error: 'Your sign-in session ended. Sign in again.' }
      }
      if (password !== null) {
        const result = await unlockNativeVault(client, data.user.id, password)
        masterKey = result.masterKey
        if (enableBiometrics) {
          if (unlockGeneration.current !== generation || stateRef.current.status !== 'authenticated-but-locked' || stateRef.current.user.id !== data.user.id) {
            return { ok: false, error: 'Unlock was interrupted. Try again.' }
          }
          await enableBiometricVault(data.user.id, masterKey, result.payload)
          enrolled = true
        }
      } else {
        const keychain = await fetchNativeVaultKeychain(client, data.user.id)
        if (unlockGeneration.current !== generation || stateRef.current.status !== 'authenticated-but-locked' || stateRef.current.user.id !== data.user.id) {
          return { ok: false, error: 'Unlock was interrupted. Try again.' }
        }
        masterKey = await readBiometricVault(data.user.id, keychain)
      }
      const enabledForUser = enrolled || await isBiometricVaultEnabled(data.user.id).catch(() => false)
      if (unlockGeneration.current !== generation || stateRef.current.status !== 'authenticated-but-locked' || stateRef.current.user.id !== data.user.id) {
        if (enrolled) await removeBiometricVault(data.user.id).catch(() => {})
        return { ok: false, error: 'Unlock was interrupted. Try again.' }
      }
      biometricUserIdRef.current = enabledForUser ? data.user.id : null
      setBiometricUserId(enabledForUser ? data.user.id : null)
      const source = createSupabaseHomeSource(client, data.user.id, masterKey)
      masterKey = null
      clearHomeSource()
      homeSourceRef.current = source
      setHomeSource(source)
      apply({ type: 'vault-unlocked' })
      return { ok: true }
    } catch (error) {
      if (password === null) {
        const settingsGeneration = biometricSettingsGeneration.current
        void isBiometricVaultEnabled(currentState.user.id).then((enabled) => {
          if (settingsGeneration === biometricSettingsGeneration.current && stateRef.current.status === 'authenticated-but-locked' && stateRef.current.user.id === currentState.user.id) {
            biometricUserIdRef.current = enabled ? currentState.user.id : null
            setBiometricUserId(enabled ? currentState.user.id : null)
          }
        }).catch(() => {})
      }
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Could not unlock the vault. Try again.',
      }
    } finally {
      masterKey?.fill(0)
      unlockInProgress.current = false
    }
  }, [apply, clearHomeSource])

  const unlockVault = useCallback((password: string, enableBiometrics = false) => unlock(password, enableBiometrics), [unlock])
  const unlockWithBiometrics = useCallback(() => unlock(null), [unlock])

  const disableBiometrics = useCallback(async (): Promise<AuthActionResult> => {
    const current = stateRef.current
    if (!isAuthenticated(current)) return { ok: false, error: 'Sign in to manage Face ID.' }
    try {
      biometricSettingsGeneration.current += 1
      await removeBiometricVault(current.user.id)
      if (biometricUserIdRef.current === current.user.id) biometricUserIdRef.current = null
      setBiometricUserId(null)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Could not remove Face ID. Please try again.' }
    }
  }, [])

  const lockVault = useCallback(() => {
    clearHomeSource()
    apply({ type: 'vault-locked' })
  }, [apply, clearHomeSource])

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    manualSignOut.current = true
    const current = stateRef.current
    biometricSettingsGeneration.current += 1
    clearHomeSource()
    apply({ type: 'vault-locked' })
    try {
      if (isAuthenticated(current)) await removeBiometricVault(current.user.id)
      biometricUserIdRef.current = null
      setBiometricUserId(null)
      await clearLocalSession()
      apply({ type: 'signed-out' })
      setNotice(null)
      return { ok: true }
    } catch {
      setNotice(SIGN_OUT_STORAGE_ERROR)
      return { ok: false, error: SIGN_OUT_STORAGE_ERROR }
    } finally {
      manualSignOut.current = false
    }
  }, [apply, clearHomeSource])

  const clearNotice = useCallback(() => setNotice(null), [])
  const value = useMemo<AuthContextValue>(() => ({
    state,
    homeSource,
    notice,
    clearNotice,
    signInWithPassword,
    requestEmailCode,
    verifyEmailCode,
    unlockVault,
    unlockWithBiometrics,
    disableBiometrics,
    biometricAvailable,
    biometricEnabled,
    lockVault,
    signOut,
  }), [state, homeSource, notice, clearNotice, signInWithPassword, requestEmailCode, verifyEmailCode, unlockVault, unlockWithBiometrics, disableBiometrics, biometricAvailable, biometricEnabled, lockVault, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider.')
  return value
}
