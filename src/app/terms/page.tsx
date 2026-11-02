import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Terms of Service · Planomy',
  description:
    'The terms for using Planomy, including account security, encrypted planner content, open-source software, and service availability.',
}

const effectiveDate = 'November 1, 2026'

export default function TermsPage() {
  return (
    <LegalPage
      activePage="/terms"
      eyebrow="Using Planomy"
      title="Terms of Service"
      summary="These terms explain the basics of using Planomy. By creating an account or using the service, you agree to them."
      lastUpdated={effectiveDate}
      sections={[
        {
          id: 'agreement',
          title: 'Using the service',
          body: (
            <>
              <p>
                Planomy provides tools for organizing tasks, lists, events, and
                plans. You may use the service only as permitted by applicable
                law and these terms. If you do not agree, do not create an
                account or continue using Planomy.
              </p>
              <p>
                Planomy is not designed for children under 13. By creating an
                account, you confirm that you are at least 13 and can agree to
                these terms under the laws that apply to you.
              </p>
              <p>
                You are responsible for the activity on your account and for
                keeping your sign-in details secure. Let us know if you
                believe someone has accessed your account without permission.
              </p>
            </>
          ),
        },
        {
          id: 'account',
          title: 'Your account and vault',
          body: (
            <>
              <p>
                Your account password lets you sign in. A separate vault
                password unlocks your encrypted plans. Keep both credentials
                private and choose a vault password you can safely retain.
              </p>
              <p>
                Planomy cannot directly decrypt your stored planner content.
                If you lose your vault password, we may not be able to restore
                access to that content.
              </p>
            </>
          ),
        },
        {
          id: 'content',
          title: 'Your content',
          body: (
            <>
              <p>
                You keep your rights to the plans and other content you add to
                Planomy. You give us the limited permission needed to store,
                synchronize, and display that content as you use the service.
              </p>
              <p>
                Planner content is encrypted on your device before it syncs.
                Some metadata, such as dates, status, and account ownership,
                remains available to the service so it can function. The{' '}
                <Link href="/privacy">Privacy Policy</Link> explains this in
                more detail.
              </p>
            </>
          ),
        },
        {
          id: 'open-source',
          title: 'Open-source software',
          body: (
            <p>
              Planomy’s source code is available in the{' '}
              <a
                href="https://github.com/giorgiotoffoli/planomy"
                target="_blank"
                rel="noreferrer"
              >
                public repository
              </a>{' '}
              under the GNU Affero General Public License, version 3 or any
              later version. That software license governs the source code.
              These terms govern your use of the hosted Planomy service.
            </p>
          ),
        },
        {
          id: 'acceptable-use',
          title: 'Acceptable use',
          body: (
            <>
              <p>You agree not to:</p>
              <ul>
                <li>use Planomy to violate the law or another person’s rights;</li>
                <li>try to access another user’s account or data;</li>
                <li>interfere with, overload, or bypass the service’s security; or</li>
                <li>use the service to distribute malware, spam, or harmful content.</li>
              </ul>
              <p>
                We may take reasonable steps to protect Planomy and its users
                when we identify misuse or a security risk.
              </p>
            </>
          ),
        },
        {
          id: 'third-party',
          title: 'Third-party services',
          body: (
            <p>
              Some features rely on providers such as Supabase for account and
              database services, or Google if you choose Google sign-in.
              Their services are subject to their own terms and privacy
              notices. Planomy is not responsible for services operated by
              those providers.
            </p>
          ),
        },
        {
          id: 'changes',
          title: 'Changes, suspension, and account deletion',
          body: (
            <>
              <p>
                We may change or discontinue parts of Planomy as the service
                develops. We may suspend access when needed to protect users,
                respond to misuse, or comply with law.
              </p>
              <p>
                You can stop using Planomy at any time. You can start account
                deletion from the web app’s account settings. Deletion removes
                the account and linked planner records from the active service;
                provider backups and logs may follow separate retention
                schedules, as described in the{' '}
                <Link href="/privacy">Privacy Policy</Link>.
              </p>
            </>
          ),
        },
        {
          id: 'disclaimers',
          title: 'Disclaimers',
          body: (
            <p>
              Planomy is provided on an “as available” basis. To the extent
              permitted by law, we do not promise uninterrupted or
              error-free service, and we do not guarantee a particular
              planning outcome. These terms do not limit warranties or
              protections that cannot be excluded under applicable law.
            </p>
          ),
        },
        {
          id: 'liability',
          title: 'Limits on liability',
          body: (
            <p>
              To the extent permitted by law, Planomy and the people who
              operate it will not be liable for indirect, incidental, special,
              consequential, or punitive damages arising from your use of the
              service. Nothing in these terms excludes liability or rights
              that cannot be excluded under applicable law.
            </p>
          ),
        },
        {
          id: 'contact',
          title: 'Updates and contact',
          body: (
            <>
              <p>
                We may update these terms as Planomy changes. The date above
                shows when the current version took effect. If a change
                materially affects your use of the service, we will provide
                notice where required by law.
              </p>
              <p>
                Questions about these terms can be sent to{' '}
                <a href="mailto:privacy@planomy.com">privacy@planomy.com</a>.
              </p>
            </>
          ),
        },
      ]}
    />
  )
}
