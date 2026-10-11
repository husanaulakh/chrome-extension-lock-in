import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
export function PublicHeader({ current }: { current: string }) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="masthead">
        <Link href="/download" className="wordmark">
          <span className="brand-icon">
            <LockKeyhole size={19} />
          </span>
          Lock in
        </Link>
        <nav className="public-nav" aria-label="Main navigation">
          <Link
            href="/download"
            aria-current={current === 'download' ? 'page' : undefined}
          >
            Download
          </Link>
          <Link
            href="/support"
            aria-current={current === 'support' ? 'page' : undefined}
          >
            Support
          </Link>
          <Link href="/">Try preview</Link>
        </nav>
      </header>
    </>
  );
}
export function PublicFooter() {
  return (
    <footer className="public-footer">
      <span>Lock in · Local by design.</span>
      <div>
        <Link href="/download">Download</Link>
        <Link href="/support">Support</Link>
        <Link href="/privacy">Privacy</Link>
      </div>
    </footer>
  );
}
