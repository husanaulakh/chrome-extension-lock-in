import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Lock in — Focus for your browser',
  icons: { icon: '/icon.svg' },
  description:
    'Choose the websites your task needs. A local, account-free focus extension with clear rules and recovery.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
