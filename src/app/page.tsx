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
  Star,
} from 'lucide-react'
import { PlanomyIcon } from '@/icons/PlanomyIcon'

export default function Page() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f3ee] text-[#121316] selection:bg-blue-200">
      <nav className="relative z-50 mx-auto flex h-16 max-w-[1320px] items-center justify-between px-5 sm:px-8">
        <Link
          href="/t3-inspired"
          className="flex items-center gap-2.5 font-heading text-[17px] font-semibold tracking-[-0.025em]"
        >
          <PlanomyIcon size={22} className="text-blue-600" />
          Planomy
        </Link>
        <a
          href="https://github.com/giorgiotoffoli/planomy"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-full border border-black/10 bg-white/55 px-3.5 py-2 text-xs font-medium shadow-sm backdrop-blur transition hover:bg-white"
        >
          <Star className="size-3.5 fill-blue-600 text-blue-600" />
          <span className="hidden sm:inline">Open source on</span> GitHub
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

        <div className="relative mx-auto max-w-[1120px] px-5 pb-0 pt-20 text-center sm:px-8 sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="mx-auto mb-7 flex w-fit items-center gap-2 rounded-full border border-blue-600/15 bg-blue-50/70 px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-blue-700"
          >
            <span className="size-1.5 rounded-full bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,.12)]" />
            Private by default
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="font-heading text-[clamp(3.5rem,8vw,7.9rem)] font-medium leading-[0.88] tracking-[-0.07em]"
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
            className="mx-auto mt-8 max-w-[620px] text-base leading-7 text-slate-600 sm:text-lg"
          >
            Tasks, lists, schedules, and boards in one calm place. Your words
            are encrypted on your device before they ever reach the cloud.
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
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <a
              href="https://github.com/giorgiotoffoli/planomy"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-2 text-xs font-medium text-slate-500 transition hover:text-slate-900"
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
            className="relative mx-auto mt-16 max-w-[980px] rounded-t-[22px] border border-black/15 bg-[#131722] p-1.5 pb-0 shadow-[0_35px_100px_rgba(37,99,235,.22)] sm:mt-24 sm:rounded-t-[30px] sm:p-2.5 sm:pb-0"
            style={{ perspective: 1200 }}
          >
            <div className="flex h-7 items-center gap-1.5 px-2 sm:h-9 sm:px-3">
              <span className="size-2 rounded-full bg-red-400/90 sm:size-2.5" />
              <span className="size-2 rounded-full bg-amber-400/90 sm:size-2.5" />
              <span className="size-2 rounded-full bg-emerald-400/90 sm:size-2.5" />
              <span className="mx-auto -translate-x-4 font-mono text-[8px] text-white/40 sm:text-[10px]">
                planomy.com/today
              </span>
            </div>

            <div className="grid min-h-[300px] overflow-hidden rounded-t-[14px] bg-white text-left sm:min-h-[470px] sm:rounded-t-[20px] md:grid-cols-[190px_1fr]">
              <aside className="hidden bg-blue-600 p-4 text-white md:block">
                <div className="mb-8 flex items-center gap-2 font-heading text-sm font-semibold">
                  <PlanomyIcon size={19} /> Planomy
                </div>
                <div className="space-y-1 text-[11px]">
                  {['Inbox', 'Today', 'Scheduled', 'Completed'].map(
                    (item, index) => (
                      <div
                        key={item}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-2 ${index === 1 ? 'bg-white/17 text-white' : 'text-blue-100'}`}
                      >
                        <span>{item}</span>
                        {index < 2 && (
                          <span className="text-[9px] opacity-60">
                            {index === 0 ? '3' : '5'}
                          </span>
                        )}
                      </div>
                    ),
                  )}
                </div>
                <div className="mt-7 border-t border-white/15 pt-5 font-mono text-[8px] uppercase tracking-[.16em] text-blue-200">
                  My lists
                </div>
                <div className="mt-3 space-y-3 text-[10px] text-blue-50">
                  <p>Personal</p>
                  <p>Deep work</p>
                  <p>Ideas</p>
                </div>
              </aside>

              <div className="bg-[#fbfcff] p-4 sm:p-7">
                <header className="flex items-start justify-between border-b border-slate-200 pb-5">
                  <div>
                    <p className="font-mono text-[8px] font-medium uppercase tracking-[.18em] text-blue-600 sm:text-[10px]">
                      Friday, August 9
                    </p>
                    <h2 className="mt-1 font-heading text-xl font-semibold tracking-tight sm:text-3xl">
                      Today
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-2 text-[9px] font-medium text-blue-700 sm:text-[10px]">
                    <LockKeyhole className="size-3" /> Vault unlocked
                  </div>
                </header>

                <div className="mt-5 grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
                  <div className="space-y-2">
                    {[
                      ['Review the product roadmap', 'Work', '10:00'],
                      ['Design landing page direction', 'Planomy', '13:30'],
                      ['Take a long walk', 'Personal', '17:00'],
                      ['Read for thirty minutes', 'Personal', 'Tonight'],
                    ].map(([task, list, time], index) => (
                      <motion.div
                        key={task}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_3px_12px_rgba(20,35,60,.035)] sm:p-4"
                        animate={
                          index === 1
                            ? { borderColor: ['#e2e8f0', '#93c5fd', '#e2e8f0'] }
                            : undefined
                        }
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <span
                          className={`grid size-4 shrink-0 place-items-center rounded-full border ${index === 0 ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}
                        >
                          {index === 0 && (
                            <Check className="size-2.5" strokeWidth={3} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-[10px] font-medium sm:text-xs ${index === 0 ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                          >
                            {task}
                          </p>
                          <p className="mt-1 text-[8px] text-slate-400 sm:text-[9px]">
                            {list}
                          </p>
                        </div>
                        <span className="font-mono text-[8px] text-slate-400 sm:text-[9px]">
                          {time}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="hidden rounded-xl border border-slate-200 bg-white p-4 lg:block">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold">This week</p>
                      <p className="font-mono text-[8px] text-slate-400">
                        8 / 12
                      </p>
                    </div>
                    <div className="mt-4 flex h-24 items-end gap-2">
                      {[38, 58, 46, 78, 62, 88, 52].map((height, index) => (
                        <div
                          key={index}
                          className="relative flex h-full flex-1 items-end overflow-hidden rounded bg-blue-50"
                        >
                          <motion.div
                            className="w-full rounded bg-blue-500"
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{
                              duration: 0.7,
                              delay: 0.7 + index * 0.06,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 rounded-lg bg-[#f4f3ee] p-3">
                      <p className="font-mono text-[8px] uppercase tracking-[.14em] text-slate-400">
                        Privacy check
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[9px] font-medium text-slate-600">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />{' '}
                        Everything is encrypted
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-b border-black/[0.07] bg-blue-600 text-white">
        <div className="mx-auto grid max-w-[1120px] gap-8 px-5 py-16 sm:px-8 sm:py-24 md:grid-cols-[.9fr_1.1fr] md:items-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-blue-200">
              End-to-end encryption
            </p>
            <h2 className="mt-4 font-heading text-4xl font-medium leading-[1] tracking-[-.045em] sm:text-6xl">
              The cloud can sync it. It can&apos;t read it.
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl border border-white/20 bg-white/20 sm:grid-cols-3">
            {[
              ['01', 'Write', 'Your plan starts in your browser.'],
              ['02', 'Encrypt', 'Private text is locked on-device.'],
              ['03', 'Sync', 'Only encrypted data reaches the cloud.'],
            ].map(([number, title, copy]) => (
              <div key={number} className="bg-blue-600 p-5 sm:p-6">
                <p className="font-mono text-[9px] text-blue-200">{number}</p>
                <h3 className="mt-8 font-heading text-lg font-semibold">
                  {title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-blue-100">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1120px] flex-col gap-5 px-5 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <PlanomyIcon size={17} className="text-blue-600" /> Planomy · Open
          source
        </div>
        <div className="flex gap-5">
          <Link href="/">Original direction</Link>
          <a href="https://github.com/giorgiotoffoli/planomy">GitHub</a>
          <Link href="/auth">Sign in</Link>
        </div>
      </footer>
    </main>
  )
}
