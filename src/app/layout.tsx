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
  description: 'Plan privately',
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
