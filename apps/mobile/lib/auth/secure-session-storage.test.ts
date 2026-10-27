import assert from 'node:assert/strict'
import test from 'node:test'
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
