import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Privacy Policy · Planomy',
  description:
    'Learn what Planomy stores, how end-to-end encryption protects planner content, and how to manage your data.',
}

const effectiveDate = 'November 1, 2026'

export default function PrivacyPage() {
  return (
    <LegalPage
      activePage="/privacy"
      eyebrow="Your information, explained"
      title="Privacy Policy"
      summary="Planomy is designed to keep the contents of your plans private. This policy explains what information is needed to run the service, what is encrypted, and what remains visible for sync."
      lastUpdated={effectiveDate}
      sections={[
        {
          id: 'information',
          title: 'Information Planomy receives',
          body: (
            <>
              <p>
                When you create or use an account, Planomy receives account
                details needed to sign you in, such as your email address and
                authentication identifiers. If you choose Google sign-in,
                Google provides the identity information needed to complete
                that sign-in.
              </p>
              <p>
                The app also stores planner data you choose to create, such as
                tasks, lists, events, and preferences. We may receive messages
                you send for support and technical information generated when
                you use the service.
              </p>
            </>
          ),
        },
        {
          id: 'encryption',
          title: 'Encryption and visible metadata',
          body: (
            <>
              <p>
                Planomy encrypts planner content on your device before it is
                synchronized. The server stores that content as encrypted
                data and cannot directly decrypt it. Your vault password is
                separate from your account sign-in password and is used to
                unlock your plans.
              </p>
              <p>
                Some metadata remains visible to the service so it can
                organize and sync your data. This can include record IDs,
                account ownership, dates, completion or focus status,
                recurrence information, and timestamps.
              </p>
              <p>
                Encryption protects stored planner content from being read
                directly by the server. It does not protect content displayed
                on an unlocked device or information exposed by a compromised
                account, device, or browser. If you lose your vault password,
                we may not be able to recover encrypted content.
              </p>
            </>
          ),
        },
        {
          id: 'use',
          title: 'How we use information',
          body: (
            <>
              <p>We use information to:</p>
              <ul>
                <li>create and secure accounts;</li>
                <li>sync plans and provide the features you request;</li>
                <li>diagnose service problems and prevent abuse;</li>
                <li>respond to support requests; and</li>
                <li>meet legal obligations and protect the service.</li>
              </ul>
              <p>
                The server cannot directly read encrypted planner content.
                The app decrypts it for you after you unlock your vault.
              </p>
            </>
          ),
        },
        {
          id: 'providers',
          title: 'Service providers',
          body: (
            <>
              <p>
                Planomy uses Supabase for authentication and database
                services. If you choose Google sign-in, Google handles that
                authentication step. Hosting, security, and delivery providers
                may process technical information needed to operate the site
                and protect the service.
              </p>
              <p>
                These providers process information under their own privacy
                notices and service arrangements. We may also disclose
                information when required by law or when necessary to protect
                users and the service.
              </p>
            </>
          ),
        },
        {
          id: 'cookies',
          title: 'Cookies, device storage, and technical logs',
          body: (
            <>
              <p>
                The web app uses session cookies to keep you signed in and
                browser storage for app preferences. Mobile apps may store
                authentication or vault information in operating-system-
                protected storage.
              </p>
              <p>
                Infrastructure providers may receive connection details such
                as IP address, browser or device type, and request times in
                operational logs. We do not use those logs to read encrypted
                planner content.
              </p>
            </>
          ),
        },
        {
          id: 'retention',
          title: 'Retention and account deletion',
          body: (
            <>
              <p>
                We keep account and planner records while your account is
                active or as needed to provide the service. You can start
                account deletion from the web app’s account settings. Deleting
                an account removes the account and linked planner records
                from the active service.
              </p>
              <p>
                Copies may remain for a time in provider backups, security
                logs, or records we must retain by law. Those providers apply
                their own retention schedules, so deletion from the active
                service does not mean every backup or log disappears
                immediately.
              </p>
            </>
          ),
        },
        {
          id: 'rights',
          title: 'Your choices and privacy rights',
          body: (
            <>
              <p>
                You can manage your account in Planomy and request deletion
                through the account settings available to you. Depending on
                where you live, you may also have rights to request access to,
                correction of, deletion of, or a copy of personal information,
                and to opt out of certain types of processing.
              </p>
              <p>
                To make a privacy request, email{' '}
                <a href="mailto:privacy@planomy.com">privacy@planomy.com</a>.
                We may need to verify your identity before responding.
              </p>
            </>
          ),
        },
        {
          id: 'children',
          title: 'Children’s privacy',
          body: (
            <p>
              Planomy is not designed for children under 13, and we do not
              knowingly collect personal information from children under 13.
              If you believe a child has provided information to Planomy,
              contact us so we can review the request and take appropriate
              steps.
            </p>
          ),
        },
        {
          id: 'changes',
          title: 'Changes and contact',
          body: (
            <>
              <p>
                We may update this policy as Planomy changes. We will revise
                the date above when we make an update.
              </p>
              <p>
                For questions or privacy requests, contact{' '}
                <a href="mailto:privacy@planomy.com">privacy@planomy.com</a>.
              </p>
            </>
          ),
        },
      ]}
    />
  )
}
