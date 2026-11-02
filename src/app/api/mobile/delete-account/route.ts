import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteAccountWithCode } from '@/lib/account-deletion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const header = request.headers.get('authorization') ?? ''
  const token = /^Bearer\s+(\S+)$/i.exec(header)?.[1] ?? ''
  let body: { code?: unknown; confirmation?: unknown }
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
    const verifier = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const result = await deleteAccountWithCode(token, typeof body.code === 'string' ? body.code : '', typeof body.confirmation === 'string' ? body.confirmation : '', {
      async getUser(jwt) {
        const { data, error } = await admin.auth.getUser(jwt)
        return error ? null : data.user
      },
      async verifyCode(email, code) {
        const { data, error } = await verifier.auth.verifyOtp({ email, token: code, type: 'email' })
        return error ? null : data.user
      },
      async deleteUser(userId) {
        const { error } = await admin.auth.admin.deleteUser(userId, false)
        return !error
      },
    })
    return Response.json({ ok: result.ok, message: result.message }, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ ok: false, message: 'Account deletion is unavailable. Please try again later.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
