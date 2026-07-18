import { auth } from '@/lib/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import DashboardNav from '@/components/DashboardNav';

// Never statically generate auth-protected pages
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-900 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-gray-700">
          <Link href="/sites" className="text-lg font-bold tracking-tight">
            a11y-scope
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">WCAG 2.2 Monitor</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <DashboardNav />
        </nav>

        <div className="px-4 py-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
