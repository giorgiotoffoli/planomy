import { createAdminClient } from '@/lib/supabase/admin'
import { deleteAccountWithPassword } from '@/lib/account-deletion'
import { consumeAccountDeletionAttempt } from '@/lib/account-deletion-rate-limit'
import { verifyAccountPassword } from '@/lib/account-password-verification'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const header = request.headers.get('authorization') ?? ''
  const token = /^Bearer\s+(\S+)$/i.exec(header)?.[1] ?? ''
  let body: { password?: unknown; confirmation?: unknown }
  try {
    const raw = await request.text()
    if (raw.length > 1024) throw new Error('Request too large')
    body = JSON.parse(raw)
    if (!body || typeof body !== 'object') throw new Error('Invalid request')
  } catch {
    return Response.json({ ok: false, message: 'Invalid request.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    return Response.json({ ok: false, message: 'Account deletion is unavailable. Please try again later.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
  try {
    const admin = createAdminClient()
    const result = await deleteAccountWithPassword(token, typeof body.password === 'string' ? body.password : '', typeof body.confirmation === 'string' ? body.confirmation : '', {
      async getUser(jwt) {
        const { data, error } = await admin.auth.getUser(jwt)
        return error || !data.user ? null : { id: data.user.id, email: data.user.email ?? null }
      },
      consumeAttempt: consumeAccountDeletionAttempt,
      verifyPassword: verifyAccountPassword,
      async deleteUser(userId) {
        const { error } = await admin.auth.admin.deleteUser(userId, false)
        return !error
      },
    })
    const headers = new Headers({ 'Cache-Control': 'no-store' })
    if (result.retryAfterSeconds) headers.set('Retry-After', String(result.retryAfterSeconds))
    return Response.json({ ok: result.ok, message: result.message }, { status: result.status, headers })
  } catch {
    return Response.json({ ok: false, message: 'Account deletion is unavailable. Please try again later.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
