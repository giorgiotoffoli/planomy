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
    if (key !== AUTH_STORAGE_KEY) {
      throw new Error('Unexpected Supabase Auth storage key.')
    }
  }

  async function clearBank(bank: Bank) {
    for (let index = 0; index < SESSION_MAX_CHUNKS; index += 1) {
      await store.deleteItemAsync(chunkKey(bank, index))
    }
  }

  async function clearAll() {
    await store.deleteItemAsync(POINTER_KEY)
    await clearBank('a')
    await clearBank('b')
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
      return serialize(readValue)
    },
    setItem(key, value) {
      assertKey(key)
      return serialize(() => writeValue(value))
    },
    removeItem(key) {
      assertKey(key)
      return serialize(clearAll)
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
