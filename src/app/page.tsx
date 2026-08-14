'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Github,
  Inbox,
  KanbanSquare,
  LockKeyhole,
  PyramidIcon,
  Star,
} from 'lucide-react'
import { PlanomyIcon } from '@/icons/PlanomyIcon'

export default function Page() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f3ee] text-[#121316] selection:bg-blue-200">
      <nav className="relative z-50 mx-auto flex h-16 max-w-330 items-center justify-between px-5 sm:px-8">
        <Link
          href="/t3-inspired"
          className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight"
        >
          <PlanomyIcon size={22} />
          Planomy
        </Link>
        <a
          href="https://github.com/giorgiotoffoli/planomy"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-full border border-black/10 bg-white/55 px-3.5 py-2 text-sm font-medium shadow-sm backdrop-blur transition hover:bg-white"
        >
          <Star className="size-4 fill-blue-600 text-blue-600" />
          <span className="hidden sm:inline">Give us a star</span>
        </a>
      </nav>

      <section className="relative border-y border-black/[0.07]">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'linear-gradient(rgba(20,38,75,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(20,38,75,.07) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'linear-gradient(to bottom, black, transparent 72%)',
          }}
        />

        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          {[
            {
              icon: Inbox,
              label: 'Inbox',
              position: 'left-[8%] top-[18%]',
              delay: 0,
            },
            {
              icon: CalendarDays,
              label: 'Today',
              position: 'right-[8%] top-[23%]',
              delay: 0.6,
            },
            {
              icon: LockKeyhole,
              label: 'Encrypted',
              position: 'left-[13%] top-[55%]',
              delay: 1.2,
            },
            {
              icon: KanbanSquare,
              label: 'Boards',
              position: 'right-[12%] top-[58%]',
              delay: 1.8,
            },
          ].map(({ icon: Icon, label, position, delay }) => (
            <motion.div
              key={label}
              className={`absolute ${position} flex items-center gap-2 rounded-xl border border-black/10 bg-[#faf9f4]/90 px-3 py-2 text-xs font-medium text-slate-600 shadow-[0_10px_30px_rgba(40,50,70,.08)] backdrop-blur`}
              animate={{ y: [0, -8, 0], rotate: [-1, 1, -1] }}
              transition={{
                duration: 5,
                delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Icon className="size-4 text-blue-600" />
              {label}
            </motion.div>
          ))}
        </div>

        <div className="relative mx-auto max-w-280 px-5 pb-0 pt-20 text-center sm:px-8 sm:pt-28">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="font-heading sm:text-[clamp(3.5rem,8vw,7.9rem)] font-medium sm:leading-[0.88] tracking-[-0.07em] text-5xl"
          >
            The open-source
            <br />
            planner for your
            <br />
            <span className="text-blue-600">private life.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-8 max-w-155 text-base leading-7 text-slate-600 sm:text-lg"
          >
            Tasks, lists, and boards in one private space. Your sensitive data
            is encrypted on your device before it ever reaches the cloud.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col items-center gap-4"
          >
            <Link
              href="/auth"
              className="group inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(37,99,235,.24)] transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Start planning privately
            </Link>
            <a
              href="https://github.com/giorgiotoffoli/planomy"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <Github className="size-3.5" />
              Inspect every line yourself
              <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 60, rotateX: 9 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto mt-16 max-w-245 rounded-t-[22px] border border-black/15 border-b-0 bg-[#131722] p-1.5 pb-0 shadow-[0_35px_100px_rgba(37,99,235,.22)] sm:mt-12 sm:rounded-t-[30px] sm:p-2.5 sm:pb-0"
            style={{ perspective: 1200 }}
          >
            <div className="h-100 overflow-hidden sm:h-120 md:h-80 lg:h-112">
              {/* Mobile */}
              <img
                src="/planomy_landing_page_mobile.png"
                alt="A custom list in Planomy mobile depicting example school tasks."
                className="w-full h-auto rounded-t-[18px] block md:hidden"
              />
              <img
                src="/planomy_landing_page_desktop.png"
                alt="A custom list in Planomy desktop depicting to-come features."
                className="w-full h-full md:h-auto rounded-t-[18px] hidden md:block"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-b border-black/[0.07] bg-blue-600 text-white">
        <div className="mx-auto grid max-w-280 gap-8 px-5 py-16 sm:px-8 sm:py-24 md:grid-cols-[.9fr_1.1fr] md:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-blue-200">
              End-to-end encryption
            </p>
            <h2 className="mt-4 font-heading text-4xl font-medium leading-none tracking-[-.045em] sm:text-6xl">
              Your life is none
              <br />
              of our business.
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl border border-white/20 bg-white/20 sm:grid-cols-3">
            {[
              ['01', 'Plan', 'Your tasks starts in your browser.'],
              ['02', 'Encrypt', 'Your data is locked on-device.'],
              ['03', 'Sync', 'Only encrypted ciphertext reaches us.'],
            ].map(([number, title, copy]) => (
              <div key={number} className="bg-blue-600 p-5 sm:p-6">
                <p className="font-mono text-sm text-blue-200">{number}</p>
                <h3 className="mt-4 font-heading text-xl font-semibold">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-5 text-blue-100">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-280 flex-col gap-5 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2 font-medium  text-slate-700">
          <PlanomyIcon size={16} /> Planomy
        </div>
        <div className="flex gap-5">
          <a href="https://www.youtube.com/@giorgiotoffoli" target="_blank">
            Progress
          </a>
          <a href="https://github.com/giorgiotoffoli/planomy" target="_blank">
            GitHub
          </a>
          <Link href="/auth">Sign in</Link>
        </div>
      </footer>
    </main>
  )
}
