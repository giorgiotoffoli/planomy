import { signIn, signUp } from './actions'

export default function AuthPage() {
  return (
    <main className="mx-auto max-w-md p-6 space-y-8">
      <section>
        <h1 className="text-2xl font-bold">Sign in</h1>
        <form action={signIn} className="mt-4 space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full rounded border p-2"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="w-full rounded border p-2"
          />
          <button className="rounded border px-4 py-2">Sign in</button>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-bold">Create account</h2>
        <form action={signUp} className="mt-4 space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full rounded border p-2"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="w-full rounded border p-2"
          />
          <button className="rounded border px-4 py-2">Sign up</button>
        </form>
      </section>
    </main>
  )
}
