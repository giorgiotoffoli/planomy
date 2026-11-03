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
import * as ExpoLinking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import type { HomeDataSource } from '@/features/home/model'
import { createSupabaseHomeSource, fetchNativeVaultKeychain, unlockNativeVault } from '@/features/home/supabase-source'
import { biometricVaultAvailable, enableBiometricVault, isBiometricVaultEnabled, readBiometricVault, removeBiometricVault } from '@/lib/vault/biometric-vault'
import { nativeE2EE } from '@/lib/vault/native-crypto'
import { ONBOARDING_VERSION } from '@planomy/lib/onboarding'
import { authErrorMessage, OTP_LENGTH } from './errors'
import { getAppleSignInCredential, isAppleSignInCanceled } from './apple-provider'
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
  verifyNativeAccountPassword,
} from '@/lib/supabase/client'

WebBrowser.maybeCompleteAuthSession()

export type VaultStatus = 'checking' | 'ready' | 'missing' | 'error'
export type EmailCodeIntent = 'sign-in' | 'sign-up'

export type AuthActionResult =
  | { ok: true; warning?: string }
  | { ok: false; error: string }

type AuthContextValue = {
  state: AuthState
  homeSource: HomeDataSource | null
  notice: string | null
  clearNotice: () => void
  signInWithPassword: (email: string, password: string) => Promise<AuthActionResult>
  updateAccountPassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<AuthActionResult>
  signInWithGoogle: () => Promise<AuthActionResult>
  signInWithApple: () => Promise<AuthActionResult>
  requestEmailCode: (email: string, intent?: EmailCodeIntent) => Promise<AuthActionResult>
  verifyEmailCode: (email: string, token: string) => Promise<AuthActionResult>
  vaultStatus: VaultStatus
  requiresAccountPassword: boolean
  refreshVaultStatus: () => Promise<AuthActionResult>
  createVault: (accountPassword: string, masterPassword: string) => Promise<AuthActionResult>
  biometricAvailable: boolean
  biometricEnabled: boolean
  signingOut: boolean
  unlockVault: (password: string, enableBiometrics?: boolean) => Promise<AuthActionResult>
  unlockWithBiometrics: () => Promise<AuthActionResult>
  enableBiometrics: (password: string) => Promise<AuthActionResult>
  disableBiometrics: () => Promise<AuthActionResult>
  lockVault: () => void
  signOut: () => Promise<AuthActionResult>
  deleteAccount: (password: string, confirmation: string) => Promise<AuthActionResult>
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
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>('checking')
  const [vaultStatusUserId, setVaultStatusUserId] = useState<string | null>(null)
  const [requiresAccountPassword, setRequiresAccountPassword] = useState(false)
  const homeSourceRef = useRef<HomeDataSource | null>(null)
  const unlockInProgress = useRef(false)
  const unlockGeneration = useRef(0)
  const stateRef = useRef<AuthState>(providerInitialState)
  const manualSignOut = useRef(false)
  const [biometricUserId, setBiometricUserId] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const biometricUserIdRef = useRef<string | null>(null)
  const biometricSettingsGeneration = useRef(0)
  const accountDeletionInProgress = useRef(false)
  const signOutInProgress = useRef(false)
  const biometricEnrollmentInProgress = useRef(false)
  const vaultStatusGeneration = useRef(0)
  const vaultSetupInProgress = useRef(false)
  const currentUserId = isAuthenticated(state) ? state.user.id : null
  const currentVaultStatus: VaultStatus = currentUserId && vaultStatusUserId === currentUserId
    ? vaultStatus
    : 'checking'
  const biometricAvailable = biometricVaultAvailable()
  const biometricEnabled = Boolean(currentUserId && biometricUserId === currentUserId)

  const apply = useCallback((event: AuthStateEvent) => {
    if (event.type === 'signed-out' || event.type === 'signed-in' || event.type === 'vault-locked' ||
      (event.type === 'session-updated' && isAuthenticated(stateRef.current) && stateRef.current.user.id !== event.user.id)) {
      unlockGeneration.current += 1
    }
    if (event.type === 'signed-out') {
      vaultStatusGeneration.current += 1
      setVaultStatusUserId(null)
      setVaultStatus('checking')
      setRequiresAccountPassword(false)
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

  const refreshVaultStatus = useCallback(async (): Promise<AuthActionResult> => {
    const current = stateRef.current
    const client = nativeSupabaseClient
    if (!client || !isAuthenticated(current)) {
      return { ok: false, error: 'Sign in before checking your encrypted vault.' }
    }

    const userId = current.user.id
    const generation = ++vaultStatusGeneration.current
    setVaultStatusUserId(userId)
    setVaultStatus('checking')
    try {
      const [userResult, keychainResult] = await Promise.all([
        client.auth.getUser(),
        client.from('user_keychain').select('user_id').eq('user_id', userId).maybeSingle(),
      ])
      if (userResult.error) throw userResult.error
      if (keychainResult.error) throw keychainResult.error
      if (
        !userResult.data.user ||
        userResult.data.user.id !== userId ||
        !isAuthenticated(stateRef.current) ||
        stateRef.current.user.id !== userId ||
        generation !== vaultStatusGeneration.current
      ) {
        return { ok: false, error: 'Your sign-in session changed. Try again.' }
      }

      setRequiresAccountPassword(userResult.data.user.user_metadata?.account_password_set !== true)
      setVaultStatus(keychainResult.data ? 'ready' : 'missing')
      return { ok: true }
    } catch {
      if (generation === vaultStatusGeneration.current) setVaultStatus('error')
      return { ok: false, error: 'Could not check your encrypted vault. Try again.' }
    }
  }, [])

  useEffect(() => {
    if (currentUserId) void refreshVaultStatus()
  }, [currentUserId, refreshVaultStatus])

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
      const persisted = await persistSuccessfulSession(data.session)
      if (persisted.ok) {
        setRequiresAccountPassword(false)
        if (data.user.user_metadata?.account_password_set !== true) {
          void client.auth.updateUser({ data: { account_password_set: true } }).catch(() => {})
        }
      }
      return persisted
    } catch (error) {
      return { ok: false, error: authErrorMessage(error, 'password') } as const
    }
  }, [persistSuccessfulSession])

  const updateAccountPassword = useCallback(async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<AuthActionResult> => {
    const client = nativeSupabaseClient
    const current = stateRef.current
    if (!client || !isAuthenticated(current)) {
      return { ok: false, error: 'Your session expired. Sign in again.' }
    }
    if (!newPassword) return { ok: false, error: 'Enter a new account password.' }
    if (newPassword !== confirmPassword) return { ok: false, error: 'New passwords do not match.' }

    try {
      const { data: userData, error: userError } = await client.auth.getUser()
      if (userError || userData.user?.id !== current.user.id) {
        return { ok: false, error: 'Your session expired. Sign in again.' }
      }
      const hasPassword = userData.user.user_metadata?.account_password_set === true
      if (hasPassword && !currentPassword) {
        return { ok: false, error: 'Enter your current account password.' }
      }
      if (hasPassword && currentPassword === newPassword) {
        return { ok: false, error: 'Choose a new password that differs from your current password.' }
      }
      if (hasPassword) {
        if (!userData.user.email) return { ok: false, error: 'The account password could not be verified. Try again.' }
        const verification = await verifyNativeAccountPassword(userData.user.email, currentPassword, current.user.id)
        if (verification === 'invalid') return { ok: false, error: 'The current account password is incorrect.' }
        if (verification === 'rate-limited') return { ok: false, error: 'Too many password attempts. Wait a few minutes and try again.' }
        if (verification !== 'verified') return { ok: false, error: 'The account password could not be verified. Try again.' }
      }

      const { error } = await client.auth.updateUser({
        password: newPassword,
        ...(hasPassword ? { current_password: currentPassword } : {}),
        data: { account_password_set: true },
      })
      if (error) {
        if (error.code === 'invalid_credentials') {
          return { ok: false, error: 'The current account password is incorrect.' }
        }
        if (error.code === 'weak_password') {
          return { ok: false, error: 'The new password does not meet the account password requirements.' }
        }
        if (error.code === 'same_password') {
          return { ok: false, error: 'Choose a new password that differs from your current password.' }
        }
        return { ok: false, error: 'The account password could not be saved. Try again.' }
      }

      setRequiresAccountPassword(false)
      try {
        const { error: signOutError } = await client.auth.signOut({ scope: 'others' })
        if (signOutError) throw signOutError
        return { ok: true }
      } catch {
        return { ok: true, warning: 'Your account password changed, but some other sessions could not be signed out.' }
      }
    } catch {
      return { ok: false, error: 'The account password could not be saved. Try again.' }
    }
  }, [])

  const signInWithGoogle = useCallback(async (): Promise<AuthActionResult> => {
    const client = nativeSupabaseClient
    if (!client) {
      return { ok: false, error: nativeSupabaseConfigurationError ?? 'Supabase is not configured.' }
    }
    if (stateRef.current.status !== 'unauthenticated') {
      return { ok: false, error: 'Sign out of the current account before switching accounts.' }
    }

    try {
      const redirectTo = ExpoLinking.createURL('auth/callback')
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error) throw error
      if (!data.url) return { ok: false, error: 'Google sign-in could not be started. Try again.' }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (result.type !== 'success') return { ok: false, error: 'Sign-in was canceled.' }

      const callbackUrl = new URL(result.url)
      const expectedUrl = new URL(redirectTo)
      if (
        callbackUrl.protocol !== expectedUrl.protocol ||
        callbackUrl.host !== expectedUrl.host ||
        callbackUrl.pathname !== expectedUrl.pathname
      ) {
        return { ok: false, error: 'The sign-in response could not be verified. Try again.' }
      }
      const callbackError = callbackUrl.searchParams.get('error_description')
      if (callbackError) return { ok: false, error: 'Google sign-in could not complete. Try again.' }
      const code = callbackUrl.searchParams.get('code')
      if (!code) return { ok: false, error: 'Google did not return a sign-in code. Try again.' }

      const flowId = callbackUrl.searchParams.get('sb_flow_id')
      const exchange = await client.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined)
      if (exchange.error) throw exchange.error
      if (!exchange.data.session) return { ok: false, error: 'Google did not return a sign-in session. Try again.' }
      return await persistSuccessfulSession(exchange.data.session)
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : ''
      if (message.includes('provider') && (message.includes('disabled') || message.includes('not enabled') || message.includes('unsupported'))) {
        return { ok: false, error: 'Google sign-in is not enabled for this Planomy environment yet.' }
      }
      return { ok: false, error: authErrorMessage(error, 'password') }
    }
  }, [persistSuccessfulSession])

  const signInWithApple = useCallback(async (): Promise<AuthActionResult> => {
    const client = nativeSupabaseClient
    if (!client) {
      return { ok: false, error: nativeSupabaseConfigurationError ?? 'Supabase is not configured.' }
    }
    if (stateRef.current.status !== 'unauthenticated') {
      return { ok: false, error: 'Sign out of the current account before switching accounts.' }
    }

    try {
      const credential = await getAppleSignInCredential()
      const { data, error } = await client.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: credential.nonce,
      })
      if (error) throw error
      if (!data.session) return { ok: false, error: 'Apple did not return a sign-in session. Try again.' }
      return await persistSuccessfulSession(data.session)
    } catch (error) {
      if (isAppleSignInCanceled(error)) return { ok: false, error: 'Sign-in was canceled.' }
      const message = error instanceof Error ? error.message.toLowerCase() : ''
      if (message.includes('provider') && (message.includes('disabled') || message.includes('not enabled') || message.includes('unsupported'))) {
        return { ok: false, error: 'Apple sign-in is not enabled for this Planomy environment yet.' }
      }
      return { ok: false, error: authErrorMessage(error, 'password') }
    }
  }, [persistSuccessfulSession])

  const requestEmailCode = useCallback(async (email: string, intent: EmailCodeIntent = 'sign-in') => {
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
        options: intent === 'sign-up'
          ? { shouldCreateUser: true, data: { account_password_set: false } }
          : { shouldCreateUser: false },
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

  const createVault = useCallback(async (
    accountPassword: string,
    masterPassword: string,
  ): Promise<AuthActionResult> => {
    const client = nativeSupabaseClient
    const current = stateRef.current
    if (!client || current.status !== 'authenticated-but-locked') {
      return { ok: false, error: 'Sign in before setting up your encrypted vault.' }
    }
    if (vaultSetupInProgress.current) return { ok: false, error: 'Vault setup is already in progress.' }
    if (masterPassword.length < 12) {
      return { ok: false, error: 'Your vault key must be at least 12 characters.' }
    }
    vaultSetupInProgress.current = true
    const userId = current.user.id
    let masterKey: Uint8Array | null = null
    try {
      const { data: userData, error: userError } = await client.auth.getUser()
      if (userError) throw userError
      if (!userData.user || userData.user.id !== userId) {
        return { ok: false, error: 'Your sign-in session changed. Sign in again.' }
      }

      const { data: existingKeychain, error: keychainCheckError } = await client
        .from('user_keychain')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()
      if (keychainCheckError) throw keychainCheckError
      if (existingKeychain) {
        setVaultStatusUserId(userId)
        setVaultStatus('ready')
        return { ok: false, error: 'This account already has a vault. Sign in again to unlock it.' }
      }

      if (userData.user.user_metadata?.account_password_set !== true) {
        if (!accountPassword) return { ok: false, error: 'Choose an account password for password sign-in.' }
        const { error } = await client.auth.updateUser({
          password: accountPassword,
          data: {
            account_password_set: true,
            onboarding_status: 'started',
            onboarding_step: 'security',
            onboarding_version: ONBOARDING_VERSION,
          },
        })
        if (error) throw error
        setRequiresAccountPassword(false)
      }

      if (
        !isAuthenticated(stateRef.current) ||
        stateRef.current.user.id !== userId
      ) {
        return { ok: false, error: 'Vault setup was interrupted. Sign in again to continue.' }
      }

      const created = await nativeE2EE.createWrappedMasterKey(masterPassword)
      masterKey = created.masterKey
      const { error: insertError } = await client.from('user_keychain').insert({
        user_id: userId,
        wrapped_master_key: created.payload.wrappedMasterKey,
        wrapping_key_salt: created.payload.wrappingKeySalt,
        wrapping_key_iv: created.payload.wrappingKeyIv,
        kdf: created.payload.kdf,
        kdf_iterations: created.payload.kdfIterations,
        wrapping_algorithm: created.payload.wrappingAlgorithm,
        version: created.payload.version,
      })
      if (insertError) {
        if ('code' in insertError && insertError.code === '23505') {
          setVaultStatusUserId(userId)
          setVaultStatus('ready')
          return { ok: false, error: 'This account already has a vault. Sign in again to unlock it.' }
        }
        throw new Error('Could not save the encrypted vault key. Try again.')
      }

      if (
        !isAuthenticated(stateRef.current) ||
        stateRef.current.user.id !== userId
      ) {
        return { ok: false, error: 'Vault setup was interrupted. Sign in again to continue.' }
      }

      const source = createSupabaseHomeSource(client, userId, masterKey)
      masterKey = null
      clearHomeSource()
      homeSourceRef.current = source
      setHomeSource(source)
      setVaultStatusUserId(userId)
      setVaultStatus('ready')
      setRequiresAccountPassword(false)
      setNotice(null)
      apply({ type: 'vault-unlocked' })
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.includes('password must be at least 12 characters')) {
        return { ok: false, error: 'Your vault key must be at least 12 characters.' }
      }
      if (message.toLowerCase().includes('password') && message.toLowerCase().includes('weak')) {
        return { ok: false, error: 'Choose a stronger account password and try again.' }
      }
      return {
        ok: false,
        error: message.startsWith('Could not save')
          ? message
          : 'Vault setup could not complete. Check your connection and try again.',
      }
    } finally {
      masterKey?.fill(0)
      vaultSetupInProgress.current = false
    }
  }, [apply, clearHomeSource])

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

  const enableBiometrics = useCallback(async (password: string): Promise<AuthActionResult> => {
    const current = stateRef.current
    const client = nativeSupabaseClient
    if (!client || current.status !== 'unlocked') return { ok: false, error: 'Unlock your vault before enabling Face ID.' }
    if (!password) return { ok: false, error: 'Enter your Vault Key to enable Face ID.' }
    if (biometricEnrollmentInProgress.current) return { ok: false, error: 'Face ID setup is already in progress.' }
    biometricEnrollmentInProgress.current = true
    const generation = ++biometricSettingsGeneration.current
    let masterKey: Uint8Array | null = null
    try {
      const { data, error } = await client.auth.getUser()
      if (error || data.user?.id !== current.user.id) throw new Error('Your session expired. Sign in again.')
      const unlocked = await unlockNativeVault(client, current.user.id, password)
      masterKey = unlocked.masterKey
      if (generation !== biometricSettingsGeneration.current || stateRef.current.status !== 'unlocked' || stateRef.current.user.id !== current.user.id) {
        return { ok: false, error: 'Face ID setup was interrupted. Try again.' }
      }
      await enableBiometricVault(current.user.id, masterKey, unlocked.payload)
      if (generation !== biometricSettingsGeneration.current || stateRef.current.status !== 'unlocked' || stateRef.current.user.id !== current.user.id) {
        await removeBiometricVault(current.user.id).catch(() => {})
        return { ok: false, error: 'Face ID setup was interrupted. Try again.' }
      }
      biometricUserIdRef.current = current.user.id
      setBiometricUserId(current.user.id)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message.replace(/vault password/gi, 'Vault Key') : 'Could not enable Face ID. Try again.' }
    } finally {
      masterKey?.fill(0)
      biometricEnrollmentInProgress.current = false
    }
  }, [])

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
    if (accountDeletionInProgress.current) return { ok: false, error: 'Account deletion is in progress. Please wait.' }
    if (signOutInProgress.current) return { ok: false, error: 'Sign-out is already in progress.' }
    signOutInProgress.current = true
    setSigningOut(true)
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
      signOutInProgress.current = false
      setSigningOut(false)
    }
  }, [apply, clearHomeSource])

  const deleteAccount = useCallback(async (password: string, confirmation: string): Promise<AuthActionResult> => {
    const client = nativeSupabaseClient
    const current = stateRef.current
    if (!client || !isAuthenticated(current)) return { ok: false, error: 'Your session expired. Sign in again.' }
    if (!password || confirmation !== 'DELETE') return { ok: false, error: 'Enter your account password and type DELETE to confirm.' }
    if (accountDeletionInProgress.current) return { ok: false, error: 'Account deletion is already in progress.' }
    accountDeletionInProgress.current = true
    const userId = current.user.id
    let managesManualSignOut = false
    try {
      try {
        const { data, error } = await client.auth.getSession()
        if (error || !data.session?.access_token || data.session.user.id !== userId || !isAuthenticated(stateRef.current) || stateRef.current.user.id !== userId) {
          return { ok: false, error: 'Your session expired. Sign in again.' }
        }
        const response = await fetch('https://www.planomy.com/api/mobile/delete-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify({ password, confirmation }),
        })
        if (response.status === 404 || response.status === 405) {
          return { ok: false, error: 'Account deletion is currently unavailable. Please try again later.' }
        }
        const result: { ok?: boolean; message?: string } = await response.json()
        if (!response.ok || result.ok !== true) return { ok: false, error: result.message || 'The account could not be deleted. Please try again.' }
      } catch {
        // A dropped response can happen after the server commits deletion.
        // Lock and clear this account locally so an ambiguous result never
        // leaves the decrypted vault open on the device.
        const latest = stateRef.current
        if (isAuthenticated(latest) && latest.user.id === userId) {
          manualSignOut.current = true
          managesManualSignOut = true
          biometricSettingsGeneration.current += 1
          clearHomeSource()
          apply({ type: 'vault-locked' })
          biometricUserIdRef.current = null
          setBiometricUserId(null)
          let cleanupFailed = false
          try { await removeBiometricVault(userId) } catch { cleanupFailed = true }
          try { await clearLocalSession() } catch { cleanupFailed = true }
          apply({ type: 'signed-out' })
          const warning = cleanupFailed
            ? 'We could not confirm deletion or fully clear saved security data on this device. Sign in again to check your account.'
            : 'We could not confirm the deletion result. This device was signed out for security; sign in again to check your account.'
          setNotice(warning)
        }
        return { ok: false, error: 'We could not confirm the deletion result. The app signed you out for security. Sign in again to check your account.' }
      }

      // The server has already deleted the account. Always attempt both local
      // cleanup steps, and never report the irreversible server action as failed.
      let cleanupFailed = false
      try { await removeBiometricVault(userId) } catch { cleanupFailed = true }
      const latest = stateRef.current
      if (isAuthenticated(latest) && latest.user.id === userId) {
        manualSignOut.current = true
        managesManualSignOut = true
        biometricSettingsGeneration.current += 1
        clearHomeSource()
        apply({ type: 'vault-locked' })
        biometricUserIdRef.current = null
        setBiometricUserId(null)
        try { await clearLocalSession() } catch { cleanupFailed = true }
        apply({ type: 'signed-out' })
        const warning = cleanupFailed ? 'Your account was deleted, but this device could not fully clear its saved sign-in or biometric data.' : null
        setNotice(warning)
        return warning ? { ok: true, warning } : { ok: true }
      }
      return cleanupFailed ? { ok: true, warning: 'Your account was deleted, but its biometric data could not be removed from this device.' } : { ok: true }
    } finally {
      if (managesManualSignOut) manualSignOut.current = false
      accountDeletionInProgress.current = false
    }
  }, [apply, clearHomeSource])

  const clearNotice = useCallback(() => setNotice(null), [])
  const value = useMemo<AuthContextValue>(() => ({
    state,
    homeSource,
    notice,
    clearNotice,
    signInWithPassword,
    updateAccountPassword,
    signInWithGoogle,
    signInWithApple,
    requestEmailCode,
    verifyEmailCode,
    vaultStatus: currentVaultStatus,
    requiresAccountPassword,
    refreshVaultStatus,
    createVault,
    unlockVault,
    unlockWithBiometrics,
    enableBiometrics,
    disableBiometrics,
    biometricAvailable,
    biometricEnabled,
    signingOut,
    lockVault,
    signOut,
    deleteAccount,
  }), [state, homeSource, notice, clearNotice, signInWithPassword, updateAccountPassword, signInWithGoogle, signInWithApple, requestEmailCode, verifyEmailCode, currentVaultStatus, requiresAccountPassword, refreshVaultStatus, createVault, unlockVault, unlockWithBiometrics, enableBiometrics, disableBiometrics, biometricAvailable, biometricEnabled, signingOut, lockVault, signOut, deleteAccount])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider.')
  return value
}
