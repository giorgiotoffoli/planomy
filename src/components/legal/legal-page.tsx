import Link from 'next/link'
import type { ReactNode } from 'react'
import { PlanomyIcon } from '@/icons/planomy-icon'

const legalLinks = [
  { href: '/philosophy', label: 'Philosophy' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
] as const

export type LegalPageSection = {
  id: string
  title: string
  body: ReactNode
}

export function LegalPage({
  activePage,
  eyebrow,
  title,
  summary,
  lastUpdated,
  sections,
}: {
  activePage: (typeof legalLinks)[number]['href']
  eyebrow: string
  title: string
  summary: string
  lastUpdated?: string
  sections: LegalPageSection[]
}) {
  return (
    <div className="min-h-screen bg-[#f6f6f8] text-[#171719] selection:bg-[#ebf1ff] dark:bg-[#141414] dark:text-[#f5f5f7] dark:selection:bg-[#1c2538]">
      <a
        href="#legal-content"
        className="sr-only z-50 rounded-lg bg-white px-4 py-3 text-[#2662d9] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 dark:bg-[#1c1c1c] dark:text-[#98b4ff]"
      >
        Skip to content
      </a>

      <header className="border-b border-[#e5e5ea] bg-[#f6f6f8] dark:border-[#333336] dark:bg-[#141414]">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <nav
            aria-label="Main navigation"
            className="flex min-h-16 items-center justify-between gap-3"
          >
            <Link
              href="/"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg pr-2 font-heading text-base font-semibold tracking-tight text-[#171719] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2662d9] dark:text-[#f5f5f7] dark:focus-visible:outline-[#98b4ff]"
            >
              <PlanomyIcon size={23} />
              Planomy
            </Link>

            <div className="flex items-center gap-1 sm:gap-2">
              {legalLinks.map((item) => {
                const isActive = item.href === activePage
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={
                      isActive
                        ? 'inline-flex min-h-11 items-center rounded-lg bg-[#ebf1ff] px-2.5 text-xs font-semibold text-[#2662d9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2662d9] sm:px-3 sm:text-sm dark:bg-[#1c2538] dark:text-[#98b4ff] dark:focus-visible:outline-[#98b4ff]'
                        : 'inline-flex min-h-11 items-center rounded-lg px-2.5 text-xs font-medium text-[#66666e] transition-colors hover:bg-white hover:text-[#171719] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2662d9] sm:px-3 sm:text-sm dark:text-[#b1b1b8] dark:hover:bg-[#1c1c1c] dark:hover:text-[#f5f5f7] dark:focus-visible:outline-[#98b4ff]'
                    }
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      </header>

      <div id="legal-content" tabIndex={-1} className="outline-none">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-[#2662d9] dark:text-[#98b4ff]">
              {eyebrow}
            </p>
            <h1 className="mt-4 font-heading text-[2.35rem] font-semibold leading-[1.08] tracking-[-0.045em] sm:text-[3.25rem]">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#66666e] sm:text-lg sm:leading-8 dark:text-[#b1b1b8]">
              {summary}
            </p>
            {lastUpdated ? (
              <p className="mt-4 text-sm text-[#85858d] dark:text-[#9999a2]">
                Effective and last updated {lastUpdated}
              </p>
            ) : null}
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
            <aside className="h-fit rounded-2xl border border-[#e5e5ea] bg-white p-5 dark:border-[#333336] dark:bg-[#1c1c1c] lg:order-2 lg:sticky lg:top-6">
              <p className="text-sm font-semibold">On this page</p>
              <ol className="mt-3 space-y-1">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={'#' + section.id}
                      className="flex min-h-11 items-center rounded-lg px-2 text-sm leading-5 text-[#66666e] transition-colors hover:bg-[#f6f6f8] hover:text-[#2662d9] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2662d9] dark:text-[#b1b1b8] dark:hover:bg-[#272729] dark:hover:text-[#98b4ff] dark:focus-visible:outline-[#98b4ff]"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </aside>

            <article className="divide-y divide-[#e5e5ea] dark:divide-[#333336] lg:order-1">
              {sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-8 py-8 first:pt-0 last:pb-0"
                >
                  <h2 className="font-heading text-2xl font-semibold leading-[1.25] tracking-[-0.025em]">
                    {section.title}
                  </h2>
                  <div className="mt-4 space-y-4 text-[15px] leading-7 text-[#59595f] sm:text-base dark:text-[#b1b1b8] [&_a]:font-medium [&_a]:text-[#2662d9] [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-[#1749b2] dark:[&_a]:text-[#98b4ff] dark:[&_a:hover]:text-[#c3d2ff] [&_li+li]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
                    {section.body}
                  </div>
                </section>
              ))}
            </article>
          </div>
        </div>
      </div>

      <footer className="border-t border-[#e5e5ea] dark:border-[#333336]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-[#66666e] sm:flex-row sm:items-center sm:justify-between sm:px-8 dark:text-[#b1b1b8]">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 font-medium text-[#171719] dark:text-[#f5f5f7]"
          >
            <PlanomyIcon size={17} />
            Planomy
          </Link>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2">
            {legalLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 items-center rounded-sm hover:text-[#2662d9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2662d9] dark:hover:text-[#98b4ff] dark:focus-visible:outline-[#98b4ff]"
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://github.com/giorgiotoffoli/planomy"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-sm hover:text-[#2662d9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2662d9] dark:hover:text-[#98b4ff] dark:focus-visible:outline-[#98b4ff]"
            >
              GitHub
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
