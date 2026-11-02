import assert from 'node:assert/strict'
import test from 'node:test'
import { createClient } from '@supabase/supabase-js'
import {
  AUTH_STORAGE_KEY,
  SESSION_CHUNK_BYTES,
  SESSION_MAX_CHUNKS,
  createSecureSessionStorage,
  type SecureKeyValueStore,
} from './secure-session-storage.ts'

class MemorySecureStore implements SecureKeyValueStore {
  values = new Map<string, string>()
  failOnSet: string | null = null
  failDelete = false

  async getItemAsync(key: string) {
    return this.values.get(key) ?? null
  }

  async setItemAsync(key: string, value: string) {
    if (key === this.failOnSet) {
      this.failOnSet = null
      throw new Error('native secure storage write failed')
    }
    this.values.set(key, value)
  }

  async deleteItemAsync(key: string) {
    if (this.failDelete) throw new Error('native secure storage delete failed')
    this.values.delete(key)
  }
}

const pointerKey = 'planomy.auth.session.pointer'
const chunkKey = (bank: 'a' | 'b', index: number) => `planomy.auth.session.${bank}.chunk.${index}`

test('large session JSON is chunked below native value limits and restores exactly', async () => {
  const nativeStore = new MemorySecureStore()
  const storage = createSecureSessionStorage(nativeStore)
  const session = JSON.stringify({
    access_token: 'a'.repeat(4200),
    refresh_token: 'r'.repeat(1500),
    user: { user_metadata: { display_name: '🗓️'.repeat(300) } },
  })

  await storage.setItem(AUTH_STORAGE_KEY, session)
  assert.equal(await storage.getItem(AUTH_STORAGE_KEY), session)
  for (const [key, value] of nativeStore.values) {
    if (key !== pointerKey) assert.ok(new TextEncoder().encode(value).length <= SESSION_CHUNK_BYTES)
  }
})

test('failed inactive-bank writes preserve the previous committed session', async () => {
  const nativeStore = new MemorySecureStore()
  const storage = createSecureSessionStorage(nativeStore)
  const first = JSON.stringify({ access_token: 'first', refresh_token: 'refresh-1' })
  const second = JSON.stringify({ access_token: 'second'.repeat(1000), refresh_token: 'refresh-2' })

  await storage.setItem(AUTH_STORAGE_KEY, first)
  nativeStore.failOnSet = chunkKey('b', 1)
  await assert.rejects(storage.setItem(AUTH_STORAGE_KEY, second), /native secure storage write failed/)
  assert.equal(await storage.getItem(AUTH_STORAGE_KEY), first)
})

test('session verification checks both persisted bearer tokens', async () => {
  const storage = createSecureSessionStorage(new MemorySecureStore())
  const session = { access_token: 'access', refresh_token: 'refresh' }
  await storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  await storage.assertSession(session)
  await assert.rejects(storage.assertSession({ ...session, refresh_token: 'other' }), /could not be verified/)
})

test('sign-out removes the pointer and all chunks from both banks', async () => {
  const nativeStore = new MemorySecureStore()
  const storage = createSecureSessionStorage(nativeStore)
  await storage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ access_token: 'one', refresh_token: 'one' }))
  await storage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ access_token: 'two', refresh_token: 'two' }))
  await storage.removeItem(AUTH_STORAGE_KEY)

  assert.equal(nativeStore.values.size, 0)
  assert.equal(await storage.getItem(AUTH_STORAGE_KEY), null)
})

test('oversized sessions fail before changing the active session', async () => {
  const nativeStore = new MemorySecureStore()
  const storage = createSecureSessionStorage(nativeStore)
  const first = JSON.stringify({ access_token: 'first', refresh_token: 'first' })
  await storage.setItem(AUTH_STORAGE_KEY, first)

  await assert.rejects(
    storage.setItem(AUTH_STORAGE_KEY, 'x'.repeat(SESSION_CHUNK_BYTES * SESSION_MAX_CHUNKS + 1)),
    /secure storage limit/,
  )
  assert.equal(await storage.getItem(AUTH_STORAGE_KEY), first)
})

test('delete failures are surfaced instead of claiming sign-out cleanup succeeded', async () => {
  const nativeStore = new MemorySecureStore()
  const storage = createSecureSessionStorage(nativeStore)
  await storage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ access_token: 'a', refresh_token: 'r' }))
  nativeStore.failDelete = true
  await assert.rejects(storage.clear(), /native secure storage delete failed/)
})

test('Supabase PKCE email requests store verifiers securely without overwriting the session', async () => {
  const nativeStore = new MemorySecureStore()
  const storage = createSecureSessionStorage(nativeStore)
  const session = JSON.stringify({ access_token: 'old-access', refresh_token: 'old-refresh' })
  const client = createClient('https://example.supabase.co', 'test-publishable-key', {
    auth: { storage, storageKey: AUTH_STORAGE_KEY, flowType: 'pkce', autoRefreshToken: false },
    global: { fetch: async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }) },
  })
  await client.auth.getSession()
  await storage.setItem(AUTH_STORAGE_KEY, session)
  const result = await client.auth.signInWithOtp({ email: 'test@example.com', options: { shouldCreateUser: true } })
  assert.equal(result.error, null)
  assert.ok([...nativeStore.values.keys()].some((key) => key.endsWith('-code-verifier')))
  assert.equal(await storage.getItem(AUTH_STORAGE_KEY), session)
  await storage.clear()
  assert.equal(nativeStore.values.size, 0)
})

test('interrupted verifier writes remain registered for secure cleanup', async () => {
  const nativeStore = new MemorySecureStore()
  const storage = createSecureSessionStorage(nativeStore)
  const verifierKey = `${AUTH_STORAGE_KEY}-flow-12345678-code-verifier`
  nativeStore.failOnSet = verifierKey
  await assert.rejects(storage.setItem(verifierKey, 'verifier'), /native secure storage write failed/)
  await storage.clear()
  assert.equal(nativeStore.values.size, 0)
  assert.throws(() => storage.getItem(`${AUTH_STORAGE_KEY}-unrelated`), /Unexpected Supabase Auth storage key/)
})

test('Google PKCE uses the matching verifier and persists the returned session', async () => {
  const storage = createSecureSessionStorage(new MemorySecureStore())
  let exchangeBody: { auth_code?: string; code_verifier?: string } | undefined
  const session = {
    access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer',
    user: { id: 'test-user', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
  }
  const client = createClient('https://example.supabase.co', 'test-publishable-key', {
    auth: { storage, storageKey: AUTH_STORAGE_KEY, flowType: 'pkce', autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      if (String(input).includes('/logout')) return new Response(null, { status: 204 })
      exchangeBody = JSON.parse(String(init?.body)) as typeof exchangeBody
      return new Response(JSON.stringify(session), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } },
  })
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google', options: { redirectTo: 'planomy://auth/callback', skipBrowserRedirect: true },
  })
  assert.equal(error, null)
  assert.ok(data.url)
  const url = new URL(data.url)
  assert.equal(url.searchParams.get('code_challenge_method'), 's256')
  const redirect = new URL(url.searchParams.get('redirect_to')!)
  assert.equal(redirect.toString(), 'planomy://auth/callback')
  const exchange = await client.auth.exchangeCodeForSession('test-code')
  assert.equal(exchange.error, null)
  assert.equal(exchangeBody?.auth_code, 'test-code')
  assert.ok(exchangeBody?.code_verifier)
  await storage.assertSession(session)
  const signedOut = await client.auth.signOut({ scope: 'local' })
  assert.equal(signedOut.error, null)
  assert.equal(await storage.getItem(AUTH_STORAGE_KEY), null)
})
