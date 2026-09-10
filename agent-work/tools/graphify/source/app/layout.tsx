import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Lock in — Make room for one thing',
  icons: { icon: '/icon.svg' },
  description:
    'Choose your task, set your boundaries, and see your progress. Thoughtful focus sessions for your browser.',
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
