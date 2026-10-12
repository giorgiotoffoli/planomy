import type { ReactNode } from 'react'

type DeadlineSectionTone =
  | 'pastDue'
  | 'today'
  | 'tomorrow'
  | 'thisWeek'
  | 'later'

const sectionToneClasses: Record<DeadlineSectionTone, string> = {
  pastDue: 'border-rose-200/80 bg-rose-50/80',
  today: 'border-blue-100/80 bg-[#eef3ff]',
  tomorrow: 'border-violet-100/80 bg-violet-50/75',
  thisWeek: 'border-amber-100/80 bg-[#fff8e9]',
  later: 'border-slate-200/80 bg-white/80',
}

const iconToneClasses: Record<DeadlineSectionTone, string> = {
  pastDue: 'text-rose-600',
  today: 'text-blue-700',
  tomorrow: 'text-violet-600',
  thisWeek: 'text-amber-600',
  later: 'text-slate-500',
}

export default function DeadlineSection({
  id,
  title,
  count,
  icon,
  tone,
  children,
}: {
  id: string
  title: string
  count: number
  icon: ReactNode
  tone: DeadlineSectionTone
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className={`overflow-hidden rounded-2xl border shadow-[0_6px_18px_rgba(62,84,120,0.04)] ${sectionToneClasses[tone]}`}
    >
      <div className="flex items-center gap-2.5 px-4 py-3 sm:px-5">
        <span className={iconToneClasses[tone]} aria-hidden="true">
          {icon}
        </span>
        <h2
          id={id}
          className="font-heading text-base font-semibold tracking-[-0.02em] text-slate-950 sm:text-lg"
        >
          {title}
        </h2>
        <span className="flex size-6 items-center justify-center rounded-full bg-slate-900/[0.06] text-[11px] font-semibold text-slate-600">
          {count}
        </span>
      </div>
      <ul className="divide-y divide-slate-200/70 px-2 pb-2 sm:px-3 sm:pb-3">
        {children}
      </ul>
    </section>
  )
}
