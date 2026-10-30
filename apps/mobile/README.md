# Planomy Mobile

The iOS foundation for Planomy lives here as an independent Expo workspace.
The app opens directly to the Home productivity dashboard, with native tabs
for Home, Calendar, and Lists. Home includes Focus, Upcoming, the calendar
preview, task editing, and Sources; the Upcoming card links to the existing
Deadlines screen. List rows use their emojis, and list detail headers use each
list's color. See `../../docs/mobile-home.md` for the current integration
boundary. The native create-task action opens the existing Add Task sheet. On
iOS 26 it uses the detached search-style tab item, and on iOS 27 it uses the
prominent native tab item; iOS manages its placement and Liquid Glass
appearance. Other platforms keep the create action in their native tab bar.
Other glass surfaces use `expo-glass-effect` only when the runtime and
accessibility settings allow it.

## Run on an iOS Simulator

From the repository root:

```sh
pnpm install
pnpm mobile:ios
```

The first run generates the ignored `apps/mobile/ios` project with Expo
Prebuild, builds it with Xcode, and opens the selected iOS Simulator. This is a
local development build and does not require a paid Apple Developer account.

For the Metro server without rebuilding native code:

```sh
pnpm mobile
```

Then press `i` in the Expo CLI, or run `pnpm mobile:ios` when the native project
needs to be rebuilt. Xcode and an installed iOS Simulator runtime are required.

## Face ID or Touch ID

Biometric vault unlock requires a native build on an iPhone or iPad with Face ID
or Touch ID enrolled. Expo Go cannot provide the required Face ID permission.
Connect and trust the device, configure signing in Xcode, and rebuild with:

```sh
pnpm --dir apps/mobile ios --device
```

On the locked screen, enter your vault password and choose **Unlock and enable
Face ID or Touch ID**. The device protects a copy of the vault key in Keychain;
the vault password is not saved. The vault locks when an enrolled app goes into
the background. You can remove biometric unlock from the locked screen or Vault
security in Settings. Signing out removes the saved key. If biometrics or the
vault keychain change, unlock with your vault password and set biometrics up
again.

## Checks

```sh
pnpm mobile:typecheck
pnpm mobile:lint
pnpm mobile:doctor
pnpm --dir apps/mobile test
```

Native Liquid Glass appearance cannot be confirmed by TypeScript or static
configuration checks. Verify the native tab bar and create-task sheet on an
iOS 26+ simulator or device after building the app.

## Environment and shared code

Mobile-only public configuration belongs in `apps/mobile/.env.local` using the
keys in `.env.example`. Only the Supabase URL and publishable key may be
exposed to this bundle; never add `SUPABASE_SECRET_KEY` or another server-only
credential here.

Native auth uses `@supabase/supabase-js` directly. It persists the Supabase
session in Expo SecureStore, backed by iOS Keychain and Android Keystore. The
adapter stores session JSON in 768-byte chunks in two alternating banks, with
a small pointer written last; interrupted writes keep the prior session, while
sign-out clears the pointer and both banks. The total session is capped at
24 KiB and storage failures are shown instead of claiming that sign-in or
sign-out completed. Refresh runs only while the app is active, and Supabase
restores the saved session on cold launch. iOS Keychain items can survive an
app uninstall/reinstall with the same bundle identifier, so users should sign
out before removing the app when they need the saved session cleared.

Email/password sign-in and existing-account email OTP are supported. OTP
requests set `shouldCreateUser: false` and require the web app's existing
8-digit email code. Sign up remains a separate section that opens web onboarding,
because new accounts need the web vault-creation flow. A restored or newly
authenticated account lands on “Your vault is locked.” No decrypted Home data
is shown until a future native vault adapter explicitly unlocks it. The raw
encryption master key is not stored by mobile auth.

The mobile bundle does not import the web app's server actions, middleware,
`@supabase/ssr` clients, or browser E2EE module. `src/lib/crypto/e2ee.ts` relies
on Web Crypto plus browser `btoa`/`atob`, so it must not be reused by native code
until a compatible implementation is designed and security-reviewed. The
Expo web export does not instantiate the native auth client or fall back to
browser storage.
Home directly reuses audited pure domain types and helpers through mobile aliases; database schemas, authentication
behavior, and encryption guarantees remain unchanged by this foundation.

## Reusable component system

The public component barrel is `components/index.ts`. Design primitives live in
`components/ui/primitives.tsx`; typed colors, list identity colors, spacing,
radii, icon sizes, and type styles live in `features/home/theme.ts`. Task, date
and scheduling, list/category, calendar, and widget building blocks are grouped
under `components/tasks`, `components/scheduling`, `components/lists`,
`components/calendar`, and `components/widgets` respectively.

Home composes the reusable Focus and Upcoming widgets, task rows, and a compact
seven-day calendar preview. The preview distinguishes task deadlines from
calendar events and is based on the shared Home Upcoming projection. Planned
session blocks are separate components; the current `HomeSnapshot` does not
yet supply scheduled sessions. Task, list, category, recurrence, and date
business rules continue to come from shared Planomy types and pure helpers.
Platform-specific symbol fallbacks and the limited Liquid Glass surface are
kept inside shared components so the screen composition remains Android-safe.
