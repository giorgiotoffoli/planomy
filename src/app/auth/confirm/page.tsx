'use client'

import { motion } from 'motion/react'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { RefreshCwIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900 relative overflow-hidden">
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
            className="text-3xl font-bold tracking-tight text-slate-900 font-stretch-150%"
          >
            Almost there!
          </motion.h1>

          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-500 mt-2"
          >
            <Card className="mx-auto max-w-md">
              <CardHeader>
                <CardTitle>Verify your login</CardTitle>
                <CardDescription>
                  Enter the verification code we sent to your email address:{' '}
                  <span className="font-medium">insert email</span>.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Field>
                  <div className="flex items-center justify-around">
                    <FieldLabel htmlFor="otp-verification">
                      Verification code
                    </FieldLabel>
                    {/* <Button variant="outline" size="sm">
                      <RefreshCwIcon />
                      Resend Code
                    </Button> */}
                  </div>
                  <div className="flex justify-around">
                    <InputOTP maxLength={6} id="otp-verification" required>
                      <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator className="mx-2" />
                      <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <FieldDescription>
                    {/* <a href="#">
                      I no longer have access to this email address.
                    </a> */}
                  </FieldDescription>
                </Field>
              </CardContent>

              <CardFooter>
                <Field>
                  <Button type="submit" className="w-full">
                    Verify
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Having trouble signing in?{' '}
                    <a
                      href="mailto:giorgio.toffoli@proton.me"
                      className="underline underline-offset-4 transition-colors hover:text-primary"
                    >
                      Contact support
                    </a>
                  </div>
                </Field>
              </CardFooter>
            </Card>
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-slate-600">
            Already confirmed?{' '}
            <button
              onClick={() => redirect('/auth')}
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Log in
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
