export type TaskWriteCrypto = {
  encryptString: (value: string, masterKey: Uint8Array) => Promise<string>
  decryptString: (
    value: string | null | undefined,
    masterKey: Uint8Array,
  ) => Promise<string>
}

export type PersistedTaskCiphertext = {
  id: string
  title: string | null
  notes: string | null
}

export async function createVerifiedEncryptedTask({
  id,
  masterKey,
  title,
  notes,
  crypto,
  assertActive,
  validate,
  insert,
  remove,
}: {
  id: string
  masterKey: Uint8Array
  title: string
  notes: string
  crypto: TaskWriteCrypto
  assertActive: () => void
  validate: () => Promise<void>
  insert: (id: string, fields: { title: string; notes: string }) => Promise<PersistedTaskCiphertext>
  remove: (id: string) => Promise<boolean>
}) {
  assertActive()
  const operationKey = masterKey.slice()

  try {
    await validate()
    assertActive()

    const expectedTitle = title.trim()
    const encryptedTitle = await crypto.encryptString(expectedTitle, operationKey)
    const encryptedNotes = await crypto.encryptString(notes, operationKey)
    assertActive()

    let created: PersistedTaskCiphertext
    try {
      created = await insert(id, { title: encryptedTitle, notes: encryptedNotes })
    } catch (cause) {
      const removed = await remove(id).catch(() => false)
      if (!removed) {
        throw new Error(
          `Could not confirm task ${id} after saving, and it could not be removed. Check your tasks before trying again.`,
        )
      }
      throw cause
    }

    let verified = false

    try {
      const decryptedTitle = await crypto.decryptString(created.title, operationKey)
      const decryptedNotes = await crypto.decryptString(created.notes, operationKey)
      verified =
        created.id === id &&
        decryptedTitle === expectedTitle &&
        decryptedNotes === notes
    } catch {
      verified = false
    }

    if (!verified) {
      const removalIds = [...new Set([created.id, id])]
      let removed = true
      for (const taskId of removalIds) {
        if (!(await remove(taskId).catch(() => false))) removed = false
      }
      if (!removed) {
        throw new Error(
          `Could not verify task ${created.id}, and it could not be removed. Check your tasks before trying again.`,
        )
      }
      throw new Error('Could not verify the saved task. It was removed; please try again.')
    }

    return created.id
  } finally {
    operationKey.fill(0)
  }
}
