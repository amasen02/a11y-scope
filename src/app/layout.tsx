import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'a11y-scope — WCAG 2.2 Accessibility Monitor',
  description: 'Self-hosted accessibility monitoring platform powered by axe-core and Playwright',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="antialiased bg-gray-50 text-gray-900 min-h-full">{children}</body>
    </html>
  );
}
