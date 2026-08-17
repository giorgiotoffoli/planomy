import type { Metadata } from 'next'
import { Inter, Geist_Mono, DM_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const interSans = Inter({
  variable: '--font-inter-sans',
  subsets: ['latin'],
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Planomy',
  description:
    "Planomy is a beautiful, open-source, end-to-end-encrypted task manager built for people who want to stay organized without giving up their privacy. Plan your days, organize projects, manage lists, and keep track of what matters through a fast, modern interface designed to stay out of your way. Unlike traditional productivity apps, Planomy is built around privacy from the start. Your plans are yours—not another source of data to analyze, profile, or monetize. With end-to-end encrypted task data and an open-source codebase, Planomy gives you more control over both your productivity and your information. Whether you're managing school, work, personal goals, or your entire life, Planomy gives you the structure of a powerful task manager without turning your private plans into someone else's data. Go ahead, plan privately.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${interSans.variable} ${geistMono.variable} ${dmSans.variable} antialiased`}
      >
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  )
}
