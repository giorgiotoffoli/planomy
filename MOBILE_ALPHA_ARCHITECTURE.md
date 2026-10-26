# Planomy Mobile alpha architecture

## Runtime path

Expo Router gates Home, task editing, Archive, and Calendar behind the native authentication state. The native Supabase client uses only the public URL and publishable key from Expo configuration. Supabase sessions stay in the existing SecureStore adapter. Password and existing-account email-code sign-in are supported; account creation remains on Planomy web.

After sign-in, the app stays locked until the user enters the existing vault password. `features/home/supabase-source.ts` reads that account's `user_keychain` row and `lib/vault/e2ee-protocol.ts` unwraps the existing 32-byte master key. `lib/vault/native-crypto.ts` supplies Expo AES-GCM and PBKDF2-SHA-256 primitives. The mobile adapter keeps the `e2ee:v1` AES-GCM string format, IV/tag layout, and stored KDF work factor. It does not create a second keychain format or persist the vault password or master key.

The decrypted `HomeSnapshot` exists only in React memory. The source adapter owns reads, encryption/decryption, and writes; `AuthProvider` disposes it and zeroes the master-key buffer when locking, signing out, or switching accounts. Home mounts only in the unlocked route tree.

## Shared behavior and persistence

The mobile UI reuses Planomy domain types and shared Home, date, event-expansion, and recurrence helpers. Recurring completion now calls a shared `occurrenceDateForCompletion` helper used by the web and mobile paths. Authenticated task queries and mutations include the current user ID. Task titles and notes, list/category labels, and event content are decrypted only after vault unlock; edits are encrypted before persistence. Focus uses the existing three-task RPC; source visibility uses the existing Home preference RPCs. Task completion, recurrence occurrences, and scheduled sessions retain their existing database fields and semantics.

Home provides Focus, Upcoming, Tasks, Stashed, source/category filtering, and task create/edit/complete/restore/delete. Archive shows tasks whose existing `completed` field is set. Calendar reads due tasks, recurring dates and sessions, persisted time blocks, and expanded events. It currently has no schedule creation or rescheduling control.

## Runtime boundary

The app has no configured `apps/mobile/.env.local` in this worktree. iOS and Android bundles compile, but real sign-in, keychain unlock, native AES execution, and cross-device persistence still need a configured development Supabase project and a simulator or device. There is no plaintext offline cache or queued offline write path.
