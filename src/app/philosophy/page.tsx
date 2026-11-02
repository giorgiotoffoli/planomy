import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Our philosophy · Planomy',
  description:
    'The principles behind Planomy: useful planning, private by design, and control that stays with you.',
}

export default function PhilosophyPage() {
  return (
    <LegalPage
      activePage="/philosophy"
      eyebrow="The idea behind Planomy"
      title="Planning should give your attention back."
      summary="A planner should make room for the life you want to live. It should not turn your plans, habits, or attention into someone else’s business."
      sections={[
        {
          id: 'make-room',
          title: 'Make room for real life',
          body: (
            <>
              <p>
                Plans are useful when they help you see what matters and choose
                what to do next. Planomy brings tasks, lists, calendars, and
                boards into one calm place so you can shape a plan that fits
                your day.
              </p>
              <p>
                The goal is not to fill every minute. It is to make the next
                step easier to find, and to leave space for the parts of life
                that do not fit on a checklist.
              </p>
            </>
          ),
        },
        {
          id: 'privacy-first',
          title: 'Privacy belongs in the foundation',
          body: (
            <>
              <p>
                Your plans can reveal a lot about your work, health, routines,
                and relationships. Planomy encrypts planner content on your
                device before it syncs, so the server cannot directly read the
                content it stores.
              </p>
              <p>
                Sync still needs some information, such as dates, ownership,
                and completion state. We explain that boundary in the{' '}
                <Link href="/privacy">Privacy Policy</Link>.
              </p>
            </>
          ),
        },
        {
          id: 'understandable',
          title: 'Useful tools should be understandable',
          body: (
            <>
              <p>
                Planomy is open source. You can inspect how the product is
                built, report a problem, or help improve it in the{' '}
                <a
                  href="https://github.com/giorgiotoffoli/planomy"
                  target="_blank"
                  rel="noreferrer"
                >
                  public repository
                </a>
                .
              </p>
              <p>
                We want the product to stay clear about what it does, what it
                stores, and where its limits are. Trust should come from
                understandable choices and working software.
              </p>
            </>
          ),
        },
        {
          id: 'your-control',
          title: 'Your plans stay yours',
          body: (
            <>
              <p>
                Your account and vault are separate: the account helps you
                access Planomy, while the vault protects your encrypted plans.
                Keep your vault password somewhere safe. If you lose it, we may
                not be able to restore access to encrypted content.
              </p>
              <p>
                We build Planomy around a simple idea: your time belongs to
                you, and your planner should help you spend it on your terms.
              </p>
            </>
          ),
        },
      ]}
    />
  )
}
