/**
 * Supabase Auth storage backed only by the iOS Keychain / Android Keystore
 * through Expo SecureStore. Session JSON is chunked because native secure
 * stores can reject a single large value (some iOS versions reject values
 * around 2 KB).
 *
 * Two fixed banks make updates transactional: write the inactive bank, then
 * atomically switch the small pointer. A failed write leaves the old session
 * active. Reads clean the inactive bank; sign-out clears the pointer first,
 * then every chunk in both banks. Storage errors are allowed to reach Auth so
 * callers can fail closed instead of claiming a session was persisted.
 */

export const AUTH_STORAGE_KEY = 'planomy.mobile.auth.v1'
export const SESSION_CHUNK_BYTES = 768
export const SESSION_MAX_CHUNKS = 32
export const SESSION_MAX_BYTES = SESSION_CHUNK_BYTES * SESSION_MAX_CHUNKS

type Bank = 'a' | 'b'
type Pointer = {
  version: 1
  bank: Bank
  chunks: number
  bytes: number
}

export interface SecureKeyValueStore {
  getItemAsync(key: string): Promise<string | null>
  setItemAsync(key: string, value: string): Promise<void>
  deleteItemAsync(key: string): Promise<void>
}

export interface SecureSessionStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  clear(): Promise<void>
  assertSession(session: { access_token: string; refresh_token: string }): Promise<void>
}

const PREFIX = 'planomy.auth.session'
const POINTER_KEY = `${PREFIX}.pointer`
const PKCE_REGISTRY_KEY = 'planomy.auth.pkce.keys'
const PKCE_LEGACY_KEY = `${AUTH_STORAGE_KEY}-code-verifier`
const PKCE_INDEX_KEY = `${AUTH_STORAGE_KEY}-flows-code-verifier`
const AUTH_USER_KEY = `${AUTH_STORAGE_KEY}-user`

function isAuxiliaryKey(key: string) {
  if (key === PKCE_LEGACY_KEY || key === PKCE_INDEX_KEY || key === AUTH_USER_KEY) return true
  const prefix = `${AUTH_STORAGE_KEY}-flow-`
  const suffix = '-code-verifier'
  if (!key.startsWith(prefix) || !key.endsWith(suffix)) return false
  return /^[A-Za-z0-9_-]{8,64}$/.test(key.slice(prefix.length, -suffix.length))
}

function chunkKey(bank: Bank, index: number) {
  return `${PREFIX}.${bank}.chunk.${index}`
}

function byteLength(value: string) {
  let bytes = 0
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4
  }
  return bytes
}

function splitIntoChunks(value: string) {
  const chunks: string[] = []
  let chunk = ''
  let size = 0

  for (const character of value) {
    const point = character.codePointAt(0) ?? 0
    const characterSize = point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4
    if (size + characterSize > SESSION_CHUNK_BYTES) {
      chunks.push(chunk)
      chunk = ''
      size = 0
    }
    chunk += character
    size += characterSize
  }

  if (chunk || chunks.length === 0) chunks.push(chunk)
  return chunks
}

function parsePointer(value: string | null): Pointer | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<Pointer>
    if (
      parsed.version === 1 &&
      (parsed.bank === 'a' || parsed.bank === 'b') &&
      Number.isInteger(parsed.chunks) &&
      parsed.chunks! >= 1 &&
      parsed.chunks! <= SESSION_MAX_CHUNKS &&
      Number.isInteger(parsed.bytes) &&
      parsed.bytes! >= 0 &&
      parsed.bytes! <= SESSION_MAX_BYTES
    ) {
      return parsed as Pointer
    }
  } catch {
    // Invalid metadata is cleared by the caller.
  }
  return null
}

export function createSecureSessionStorage(
  store: SecureKeyValueStore,
): SecureSessionStorage {
  let queue = Promise.resolve()

  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation)
    queue = result.then(() => undefined, () => undefined)
    return result
  }

  function assertKey(key: string) {
    if (key !== AUTH_STORAGE_KEY && !isAuxiliaryKey(key)) {
      throw new Error('Unexpected Supabase Auth storage key.')
    }
  }

  async function readPkceRegistry(): Promise<string[]> {
    const raw = await store.getItemAsync(PKCE_REGISTRY_KEY)
    if (raw === null) return []
    try {
      const keys: unknown = JSON.parse(raw)
      if (Array.isArray(keys) && keys.every((key) => typeof key === 'string' && isAuxiliaryKey(key))) return keys
    } catch {
      // An invalid registry cannot safely be discarded during sign-out.
    }
    throw new Error('Secure authentication storage metadata is invalid.')
  }

  async function writePkceValue(key: string, value: string) {
    if (byteLength(value) > 1800) throw new Error('Authentication verifier exceeds the secure storage limit.')
    const keys = await readPkceRegistry()
    if (!keys.includes(key)) {
      const next = JSON.stringify([...keys, key])
      if (byteLength(next) > 1800) throw new Error('Too many pending sign-in attempts.')
      // Register first, so an interrupted write can still be cleaned up.
      await store.setItemAsync(PKCE_REGISTRY_KEY, next)
    }
    await store.setItemAsync(key, value)
  }

  async function removePkceValue(key: string) {
    const keys = await readPkceRegistry()
    await store.deleteItemAsync(key)
    const remaining = keys.filter((item) => item !== key)
    if (remaining.length) await store.setItemAsync(PKCE_REGISTRY_KEY, JSON.stringify(remaining))
    else await store.deleteItemAsync(PKCE_REGISTRY_KEY)
  }

  async function clearBank(bank: Bank) {
    const results = await Promise.allSettled(
      Array.from({ length: SESSION_MAX_CHUNKS }, (_, index) => store.deleteItemAsync(chunkKey(bank, index))),
    )
    const failure = results.find((result) => result.status === 'rejected')
    if (failure?.status === 'rejected') throw failure.reason
  }

  async function clearAll() {
    await store.deleteItemAsync(POINTER_KEY)
    await clearBank('a')
    await clearBank('b')
    const keys = await readPkceRegistry()
    for (const key of new Set([...keys, PKCE_LEGACY_KEY, PKCE_INDEX_KEY, AUTH_USER_KEY])) {
      await store.deleteItemAsync(key)
    }
    await store.deleteItemAsync(PKCE_REGISTRY_KEY)
  }

  async function readPointer() {
    const raw = await store.getItemAsync(POINTER_KEY)
    if (raw === null) return null
    const pointer = parsePointer(raw)
    if (pointer) return pointer
    await clearAll()
    return null
  }

  async function readValue() {
    const pointer = await readPointer()
    if (!pointer) {
      // Also removes orphaned chunks after an interrupted first write.
      await clearBank('a')
      await clearBank('b')
      return null
    }

    const parts: string[] = []
    for (let index = 0; index < pointer.chunks; index += 1) {
      const part = await store.getItemAsync(chunkKey(pointer.bank, index))
      if (part === null) {
        await clearAll()
        return null
      }
      parts.push(part)
    }

    const value = parts.join('')
    if (byteLength(value) !== pointer.bytes) {
      await clearAll()
      return null
    }

    await clearBank(pointer.bank === 'a' ? 'b' : 'a')
    return value
  }

  async function writeValue(value: string) {
    const bytes = byteLength(value)
    if (bytes > SESSION_MAX_BYTES) {
      throw new Error('Supabase session exceeds the secure storage limit.')
    }

    const chunks = splitIntoChunks(value)
    if (chunks.length > SESSION_MAX_CHUNKS) {
      throw new Error('Supabase session exceeds the secure storage limit.')
    }

    const previous = await readPointer()
    const nextBank: Bank = previous?.bank === 'a' ? 'b' : 'a'
    await clearBank(nextBank)

    try {
      for (let index = 0; index < chunks.length; index += 1) {
        await store.setItemAsync(chunkKey(nextBank, index), chunks[index])
      }
    } catch (error) {
      try {
        await clearBank(nextBank)
      } catch {
        // The old pointer still selects the previous complete session.
      }
      throw error
    }

    const nextPointer: Pointer = {
      version: 1,
      bank: nextBank,
      chunks: chunks.length,
      bytes,
    }
    const encodedPointer = JSON.stringify(nextPointer)
    try {
      await store.setItemAsync(POINTER_KEY, encodedPointer)
    } catch (error) {
      // Some native failures can happen after a successful Keychain write.
      // Read the pointer back so we never delete a bank that actually committed.
      const committed = parsePointer(await store.getItemAsync(POINTER_KEY))
      if (
        !committed ||
        committed.bank !== nextPointer.bank ||
        committed.chunks !== nextPointer.chunks ||
        committed.bytes !== nextPointer.bytes
      ) {
        try {
          await clearBank(nextBank)
        } catch {
          // The pointer remains on the old bank; orphan cleanup runs on read.
        }
        throw error
      }
    }

    await clearBank(previous?.bank ?? (nextBank === 'a' ? 'b' : 'a'))
  }

  return {
    getItem(key) {
      assertKey(key)
      return serialize(() => key === AUTH_STORAGE_KEY ? readValue() : store.getItemAsync(key))
    },
    setItem(key, value) {
      assertKey(key)
      return serialize(() => key === AUTH_STORAGE_KEY ? writeValue(value) : writePkceValue(key, value))
    },
    removeItem(key) {
      assertKey(key)
      return serialize(() => key === AUTH_STORAGE_KEY ? clearAll() : removePkceValue(key))
    },
    clear() {
      return serialize(clearAll)
    },
    async assertSession(session) {
      const value = await this.getItem(AUTH_STORAGE_KEY)
      if (!value) throw new Error('Supabase session was not persisted securely.')
      let stored: { access_token?: unknown; refresh_token?: unknown }
      try {
        stored = JSON.parse(value) as typeof stored
      } catch {
        throw new Error('Supabase session could not be verified securely.')
      }
      if (
        stored.access_token !== session.access_token ||
        stored.refresh_token !== session.refresh_token
      ) {
        throw new Error('Supabase session could not be verified securely.')
      }
    },
  }
}
