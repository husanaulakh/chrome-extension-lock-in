import Link from 'next/link';
import type { Metadata } from 'next';
import { PublicHeader, PublicFooter } from '../public-chrome';
export const metadata: Metadata = {
  title: 'Privacy — Lock in',
  description:
    'What Lock in stores locally, how private browsing works, and how to export or delete records.',
};
export default function PrivacyPage() {
  return (
    <div className="shell public-site">
      <PublicHeader current="privacy" />
      <main id="main-content" className="reading-page">
        <p className="eyebrow">YOUR FOCUS STAYS YOURS</p>
        <h1>Privacy, in plain language.</h1>
        <p className="reading-lead">
          The Lock in extension sends no browsing records to a server. It has no
          accounts, analytics, ads, payments, remote scripts, or
          synchronization.
        </p>
        <section>
          <h2>What stays on your device</h2>
          <p>
            Regular sessions store task names, focus URLs, resource rules,
            blocked domains, deadlines, added time, temporary grants, and
            domain-level blocked attempts. Focus URLs may include personal
            document IDs and query values. Access and exit reasons are checked
            but not retained. Up to 100 sessions and 2,000 attempts per session
            are retained.
          </p>
        </section>
        <section>
          <h2>Private browsing</h2>
          <p>
            Firefox private sessions are unavailable in 0.2.1 because its shared
            background context cannot isolate them from normal windows. Regular
            sessions can cover private windows with permission; private attempts
            remain excluded. Chromium private sessions retain their existing
            temporary-storage behavior.
          </p>
          <p>
            Private attempts are excluded from reports. Private sessions use
            temporary browser storage and temporary rules with no saved history;
            closing the browser clears them. Changing an existing regular
            session from a private window still changes that regular saved
            session. Coverage requires the browser’s private-window permission.
          </p>
        </section>
        <section>
          <h2>Permissions and blocked destinations</h2>
          <p>
            Storage and alarms maintain deadlines. Tabs, webNavigation, HTTP(S)
            website access, and declarative network rules check destinations and
            redirect pages. The extension does not read page contents,
            passwords, cookies, or keyboard input.
          </p>
          <p>
            A blocked destination is temporarily carried in the block page’s URL
            fragment so you can return after access is granted. Attempt
            statistics do not retain that destination’s path or query.
          </p>
        </section>
        <section>
          <h2>Export or delete your data</h2>
          <p>
            Export from the extension Dashboard. Exports contain personal
            session information; treat them as private backups. Delete history
            from Dashboard when inactive, or remove the extension to clear its
            storage. The website preview uses separate localStorage records;
            clear site data in browser settings to remove those. Nothing syncs
            between the preview and the extension.
          </p>
        </section>
        <section>
          <h2>This website and browser services</h2>
          <p>
            The website hosting provider and your browser or extension store may
            process ordinary service requests and diagnostics under their own
            policies. Those services are separate from the extension’s local
            session records. The website does not need your extension history to
            provide downloads.
          </p>
        </section>
        <section>
          <h2>Release status</h2>
          <p>
            Updated 9 September 2026. These downloads are a developer preview.
            Publisher identity and a privacy contact must be supplied before
            public store submission. See{' '}
            <Link href="/support">support and known limits</Link>.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
