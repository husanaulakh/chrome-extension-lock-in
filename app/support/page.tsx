import Link from 'next/link';
import type { Metadata } from 'next';
import { PublicHeader, PublicFooter } from '../public-chrome';
export const metadata: Metadata = {
  title: 'Support — Lock in',
  description:
    'Installation, permissions, recovery, updates, and local data help for Lock in.',
};
export default function SupportPage() {
  return (
    <div className="shell public-site">
      <PublicHeader current="support" />
      <main id="main-content" className="reading-page">
        <p className="eyebrow">HELP WHEN YOU NEED IT</p>
        <h1>Keep your work moving.</h1>
        <p className="reading-lead">
          Start with the{' '}
          <Link href="/download#install">browser installation guide</Link>. The
          website preview and the extension keep separate records.
        </p>
        <section>
          <h2>Set up your first session</h2>
          <ol>
            <li>
              Save unfinished work in your open tabs. Pages outside your rules
              may redirect when the session begins.
            </li>
            <li>
              Enter one task, a duration, and a focus website. Choose an entire
              website or one exact URL.
            </li>
            <li>
              Add reference sites and any required sign-in destinations under
              More resources &amp; blocking rules.
            </li>
            <li>
              Use “Will this page be allowed?” to check a destination before
              starting. Exact URLs include the path, query, and fragment.
            </li>
            <li>
              Review your commitment level and temporary-access policy, then
              start from the extension icon.
            </li>
          </ol>
        </section>
        <section>
          <h2>A page I need was blocked</h2>
          <p>
            Request temporary access from the blocked page when your session
            policy allows it. An entire website grant can cover more pages than
            an exact URL rule. If your work cannot continue, open the extension
            and choose Technical recovery to end the session immediately.
            Recovery is recorded in regular history.
          </p>
        </section>
        <section>
          <h2>The extension is not responding</h2>
          <p>
            Close and reopen the popup, then use its retry action if offered. If
            it still fails, open your browser’s extension management page and
            reload Lock in. A browser restart may also help. If blocking
            persists and recovery cannot connect, disable the extension from
            browser settings. Disabling it stops its rules; save work before
            re-enabling it.
          </p>
          <p>
            Do not delete local data as a first troubleshooting step. Export a
            backup from Dashboard whenever it is available.
          </p>
        </section>
        <section>
          <h2>Private windows</h2>
          <p>
            Firefox private sessions are unavailable in 0.2.1 because its shared
            background context cannot isolate them from normal windows. Regular
            sessions can cover private windows with permission; private attempts
            remain excluded. Chromium private sessions retain their existing
            temporary-storage behavior.
          </p>
          <p>
            Enable “Allow in Incognito” in Chrome or Edge, or “Run in Private
            Windows” in Firefox’s add-on settings. The popup reports whether
            private access is available. Private attempts are not added to
            regular history; private sessions are temporary and do not produce
            saved history. Changing a regular session from a private window
            still changes that saved regular session.
          </p>
        </section>
        <section>
          <h2>Records, backups, and deletion</h2>
          <p>
            Use Dashboard in the extension to export records or delete history
            when no session is active. Backups can contain task names and full
            focus URLs, so keep them private. Removing the extension clears its
            extension storage. Clear this website’s site data to remove preview
            records.
          </p>
        </section>
        <section>
          <h2>Update a manual installation</h2>
          <p>
            Finish your session and export a backup. Download the new ZIP,
            extract it into the same installation folder, then reload the
            extension on the browser’s extension management page. Keep that
            folder in place. Firefox temporary add-ons must be loaded again
            after a browser restart. Store-managed installation and automatic
            updates will become available only after a signed listing is
            published.
          </p>
        </section>
        <section>
          <h2>Known limits and support status</h2>
          <p>
            Lock in controls supported HTTP and HTTPS pages, not desktop
            applications, browser settings, or other browsers. It cannot
            guarantee recovery of unsaved page state. Safari and mobile are not
            currently supported. These packages are a developer preview; store
            approval and a dedicated publisher support channel are still
            pending.
          </p>
          <p>
            If reporting a problem to the person who supplied this preview,
            include your browser/version, extension version, steps to reproduce,
            and any visible error. Remove private URLs and task details before
            sharing logs or exports.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
