# Planomy iOS foundation

The native companion is isolated at `apps/mobile`. The existing Next.js app
remains the repository root package and keeps its current authentication,
Supabase, and encryption boundaries.

## Current architecture

- Expo SDK 58 with React Native 0.88 and TypeScript.
- Expo Router native tabs for Home, Calendar, Lists, and the create-task action.
- Home opens directly to the productivity dashboard; Upcoming links to the
  existing Deadlines screen. List rows use their emojis; detail headers use
  their list colors.
- The native create-task action opens the existing Add Task sheet.
- On iOS 26, the action uses the detached search-style tab item. On iOS 27, it
  uses `prominentScreenKey`; iOS manages the native placement and Liquid Glass
  appearance. Other platforms retain their system tab rendering.
- Native stack layouts provide iOS large-title navigation.
- `expo-glass-effect` behind runtime and `reduceTransparency` checks for
  selected surfaces, with a readable fallback on unsupported devices.
- Generated native projects are ignored so local prebuild output does not
  become a second hand-maintained iOS application in this foundation branch.

## Shared-code boundary

The web Supabase client uses `@supabase/ssr` and Next.js environment variables.
The server client, admin client, middleware, and server actions stay out of the
native bundle. Phase 1 uses a separate `@supabase/supabase-js` client with only
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Its
session is stored in chunked Expo SecureStore values, with refresh while active
and restoration on cold launch. Password sign-in and existing-account 8-digit
email OTP are supported; OTP sign-in uses `shouldCreateUser: false`.

Auth does not unlock the vault. Protected routing sends signed-in users to a
locked-pending screen, and mounts `HomeProvider` only after an explicit future
vault-unlocked transition. The session storage adapter stores Supabase tokens,
not the encryption master key.

The existing `src/lib/crypto/e2ee.ts` uses Web Crypto and browser base64 APIs.
It is valuable as a protocol reference, but it is not imported by the mobile
app. A native vault implementation must preserve the existing wire format and
key-handling guarantees, use platform-appropriate secure storage, and receive a
separate security review before vault unlock or data sync is added.

Pure TypeScript domain types and platform-neutral business logic can be
considered for a future shared package after checking their imports. This
branch deliberately does not move or duplicate those modules.

## Liquid Glass support

The native tab bar supplies the platform's Liquid Glass appearance on supported
iOS versions. The create action remains a native tab item: iOS 26 uses the
search-style detached position, and iOS 27 uses the prominent item keyed to the
compose route. The app does not draw or position a custom glass approximation
for the tab bar. Other glass surfaces fall back to readable solid surfaces on
unsupported runtimes or when Reduce Transparency is enabled.

Static checks cannot prove the visual effect. Use `pnpm mobile:ios` and inspect
the built app on a supported simulator or device for visual verification.
