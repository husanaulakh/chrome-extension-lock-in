import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
} from 'lucide-react';
import { PublicHeader, PublicFooter } from '../public-chrome';
export const metadata: Metadata = {
  title: 'Download Lock in — Focus for your browser',
  description:
    'Get the local-first focus extension for desktop browsers. Clear installation steps for Chrome, Edge, and Firefox.',
};
export default function DownloadPage() {
  return (
    <div className="shell public-site">
      <PublicHeader current="download" />
      <main id="main-content">
        <section className="download-hero">
          <div>
            <p className="preview-badge">Lock in for desktop browsers</p>
            <h1>
              A little more<br />focus.
            </h1>
            <p className="hero-description">
              Choose the websites you need for a task. Pause the rest until
              you’re done. Your rules, your time, and your records stay with you.
            </p>
            <a className="download-primary" href="#install">
              Get the extension <ArrowDownToLine size={18} />
            </a>
            <Link className="download-secondary" href="/">
              Try the interactive preview <ArrowUpRight size={16} />
            </Link>
            <ul className="trust-points">
              <li>
                <Check size={15} /> Free to use
              </li>
              <li>
                <Check size={15} /> No account
              </li>
              <li>
                <Check size={15} /> No analytics in the extension
              </li>
            </ul>
          </div>
          <figure className="product-capture">
            <div className="capture-caption"><span>Inside Lock in</span><span>Browser extension</span></div>
            <Image unoptimized src="/extension-preview.png" width="1280" height="800" alt="The Lock in extension setup, with task, website, duration, and commitment controls." />
            <figcaption>A few choices. A clearer place to start.</figcaption>
          </figure>
        </section>
        <section
          id="install"
          className="install-section"
          aria-labelledby="install-title"
        >
          <p className="eyebrow">DOWNLOAD & INSTALL</p>
          <h2 id="install-title">Ready when you are.</h2>
          <p className="section-description">
            These are manual-install preview packages. Store listings are not
            live yet. Downloading a ZIP does not install the extension.
          </p>
          <p className="release-links">
            Version 0.3.0 ·{' '}
            <a href="/SHA256SUMS" download>
              Download checksums
            </a>{' '}
            ·{' '}
            <a href="/docs/RELEASE-NOTES.md" download>
              Release notes
            </a>
          </p>
          <div className="browser-grid">
            <article className="browser-card">
              <span className="release-status">Manual installation</span>
              <h3>Chrome &amp; Edge</h3>
              <p>Chrome 120+ and compatible desktop Chromium browsers.</p>
              <a
                className="download-primary"
                href="/lock-in-chromium.zip"
                download="lock-in-chromium.zip"
              >
                Download Chromium ZIP <ArrowDownToLine size={17} />
              </a>
              <ol>
                <li>
                  Download and extract the ZIP into a folder you will keep.
                </li>
                <li>
                  Open <code>chrome://extensions</code> in Chrome or{' '}
                  <code>edge://extensions</code> in Edge.
                </li>
                <li>
                  Enable <strong>Developer mode</strong>, choose{' '}
                  <strong>Load unpacked</strong>, and select the extracted
                  folder containing <code>manifest.json</code>.
                </li>
                <li>
                  Pin Lock in from the browser’s Extensions menu, then open it
                  to start.
                </li>
              </ol>
              <p className="browser-note">
                Chrome has prior local testing. Edge, Brave, and Opera use
                Chromium packages but still need individual release validation.
              </p>
            </article>
            <article className="browser-card">
              <span className="release-status">
                Temporary developer installation
              </span>
              <h3>Firefox</h3>
              <p>
                Firefox 142+ on desktop. A signed public download is not yet
                available.
              </p>
              <a
                className="download-primary"
                href="/lock-in-firefox.zip"
                download="lock-in-firefox.zip"
              >
                Download Firefox ZIP <ArrowDownToLine size={17} />
              </a>
              <ol>
                <li>Download and extract the ZIP.</li>
                <li>
                  Open <code>about:debugging#/runtime/this-firefox</code>.
                </li>
                <li>
                  Choose <strong>Load Temporary Add-on</strong> and select{' '}
                  <code>manifest.json</code> in the extracted folder.
                </li>
                <li>
                  Open Lock in from the Extensions menu. This installation is
                  removed when Firefox restarts.
                </li>
              </ol>
              <p className="browser-note">
                A permanent install requires Mozilla signing. Do not use
                “Install Add-on From File” with this unsigned ZIP.
              </p>
            </article>
          </div>
          <div className="compatibility-note">
            <strong>Safari and mobile</strong>
            <p>
              No compatible package is available yet. Safari needs a separate
              Apple extension app and signing. These downloads are for desktop
              browsers.
            </p>
          </div>
        </section>
        <section className="download-faq" aria-labelledby="before-title">
          <h2 id="before-title">Before your first session</h2>
          <details>
            <summary>What browser permissions does Lock in need?</summary>
            <p>
              Website access, tabs, and navigation permissions let it check
              destinations and redirect pages outside your chosen boundaries.
              Storage and alarms keep your session and timer. The extension does
              not read page contents, passwords, cookies, or keystrokes.{' '}
              <Link href="/privacy">Read the privacy details</Link>.
            </p>
          </details>
          <details>
            <summary>Will this website block other tabs?</summary>
            <p>
              No. The website is an interactive preview with separate local
              records. Install and open the extension to manage browser tabs.
              Website sessions do not sync to the extension.
            </p>
          </details>
          <details>
            <summary>Can I recover if a rule blocks my work?</summary>
            <p>
              Yes. Technical recovery is always available in the extension. Save
              unfinished work before starting: open tabs may redirect. Lock in
              is a commitment aid; browser settings and other browsers remain
              available.
            </p>
          </details>
          <details>
            <summary>What about private browsing and updates?</summary>
            <p>
              Private-window coverage requires your permission in the browser’s
              extension settings. Private attempts are excluded from history.
              Starting private sessions in Firefox is unavailable because its
              background context is shared with normal windows. Manual installs
              do not receive store updates automatically: finish your session,
              export any records you want to keep, replace the files in the same
              folder, and reload the extension.{' '}
              <Link href="/support">Open the support guide</Link>.
            </p>
          </details>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
