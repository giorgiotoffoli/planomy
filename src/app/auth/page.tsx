'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Mail, Lock, ArrowRight, Pyramid } from 'lucide-react'
import { signIn, signUp } from './actions'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

function DisplayErrorMessage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  if (message) {
    return (
      <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {message}
      </div>
    )
  } else {
    return
  }
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const passwordsMatch = password.length > 0 && password === confirmPassword

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4  text-slate-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl font-bold tracking-tight text-slate-900 font-stretch-expanded"
          >
            <div className="flex align-baseline justify-center gap-2 ">
              <Pyramid className="relative top-1.5" />
              <h2 className="font-stretch-expanded">Planomy</h2>
            </div>
          </motion.h1>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-500 mt-2"
          >
            {isLogin
              ? 'Welcome back! Please enter your details.'
              : 'Create an account to get started.'}
          </motion.p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-white overflow-hidden relative"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login' : 'signup'}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <form
                className="space-y-5"
                action={isLogin ? signIn : signUp}
                onSubmit={() =>
                  toast(`${isLogin ? 'Logging in...' : 'Signing up...'}`)
                }
              >
                <DisplayErrorMessage />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      className="block w-full pl-11 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors bg-slate-50/50 focus:bg-white sm:text-sm outline-none"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Password
                    </label>
                    {isLogin && (
                      <a
                        href="#"
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Forgot password?
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      className="block w-full pl-11 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors bg-slate-50/50 focus:bg-white sm:text-sm outline-none"
                      placeholder="••••••••"
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                {!isLogin && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-slate-700">
                        Confirm password
                      </label>
                      {!isLogin &&
                        confirmPassword.length > 0 &&
                        (passwordsMatch ? (
                          <span className="text-sm font-medium text-green-500">
                            Passwords match
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-rose-500">
                            Passwords do not match
                          </span>
                        ))}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        type="password"
                        name="confirm-password"
                        className="block w-full pl-11 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors bg-slate-50/50 focus:bg-white sm:text-sm outline-none"
                        placeholder="••••••••"
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-blue-700"
                  disabled={!isLogin && !passwordsMatch}
                >
                  {isLogin ? 'Sign in' : 'Create account'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </form>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-slate-600">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
