import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createVerifiedEncryptedTask, type TaskWriteCrypto } from './verified-task-write.ts'

function fakeCrypto(): TaskWriteCrypto {
  return {
    async encryptString(value, masterKey) {
      return `cipher:${Array.from(masterKey).join('.')}:${encodeURIComponent(value)}`
    },
    async decryptString(value, masterKey) {
      if (!value?.startsWith(`cipher:${Array.from(masterKey).join('.')}:`)) {
        throw new Error('Could not decrypt encrypted value.')
      }
      return decodeURIComponent(value.slice(value.lastIndexOf(':') + 1))
    },
  }
}

test('a lock during organization validation aborts before encrypted task creation', async () => {
  const masterKey = new Uint8Array([11, 22, 33])
  let active = true
  let encryptCalls = 0
  let insertCalls = 0
  const crypto = fakeCrypto()

  await assert.rejects(
    () => createVerifiedEncryptedTask({
      id: 'locked-task',
      masterKey,
      title: 'Prepare launch notes',
      notes: '',
      crypto: {
        ...crypto,
        async encryptString(value, key) {
          encryptCalls += 1
          return crypto.encryptString(value, key)
        },
      },
      assertActive() {
        if (!active) throw new Error('Your vault is locked. Unlock it to continue.')
      },
      async validate() {
        await Promise.resolve()
        masterKey.fill(0)
        active = false
      },
      async insert() {
        insertCalls += 1
        throw new Error('Task should not be inserted after lock.')
      },
      async remove() {
        return true
      },
    }),
    /vault is locked/,
  )

  assert.equal(encryptCalls, 0)
  assert.equal(insertCalls, 0)
})

test('a saved row is removed when the server ciphertext cannot be confirmed', async () => {
  const masterKey = new Uint8Array([7, 8, 9])
  const removedIds: string[] = []
  const crypto = fakeCrypto()

  await assert.rejects(
    () => createVerifiedEncryptedTask({
      id: 'task-with-bad-ciphertext',
      masterKey,
      title: 'Prepare launch notes',
      notes: 'Include the timeline',
      crypto,
      assertActive() {},
      async validate() {},
      async insert(id, fields) {
        return { id, ...fields, title: 'damaged-value' }
      },
      async remove(id) {
        removedIds.push(id)
        return true
      },
    }),
    /It was removed/,
  )

  assert.deepEqual(removedIds, ['task-with-bad-ciphertext'])
})

test('an unconfirmed insert is removed by its client-generated task ID', async () => {
  const masterKey = new Uint8Array([17, 18, 19])
  const removedIds: string[] = []

  await assert.rejects(
    () => createVerifiedEncryptedTask({
      id: 'unconfirmed-task',
      masterKey,
      title: 'Prepare launch notes',
      notes: '',
      crypto: fakeCrypto(),
      assertActive() {},
      async validate() {},
      async insert() {
        throw new Error('The server response could not be confirmed.')
      },
      async remove(id) {
        removedIds.push(id)
        return true
      },
    }),
    /server response could not be confirmed/,
  )

  assert.deepEqual(removedIds, ['unconfirmed-task'])
})

test('a task is returned only after the persisted title and notes decrypt correctly', async () => {
  const masterKey = new Uint8Array([41, 42, 43])
  const crypto = fakeCrypto()
  const persisted: { id: string; title: string; notes: string }[] = []

  const id = await createVerifiedEncryptedTask({
    id: 'verified-task',
    masterKey,
    title: '  Prepare launch notes  ',
    notes: 'Include the timeline',
    crypto,
    assertActive() {},
    async validate() {},
    async insert(id, fields) {
      const row = { id, ...fields }
      persisted.push(row)
      return row
    },
    async remove() {
      throw new Error('A confirmed task must not be removed.')
    },
  })

  assert.equal(id, 'verified-task')
  assert.equal(persisted.length, 1)
  assert.equal(await crypto.decryptString(persisted[0].title, masterKey), 'Prepare launch notes')
  assert.equal(await crypto.decryptString(persisted[0].notes, masterKey), 'Include the timeline')
})
