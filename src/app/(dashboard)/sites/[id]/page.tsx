import { db } from '@/lib/db';
import { scans, sites } from '@/lib/schema';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import TrendChart from '@/components/TrendChart';
import ScanNowButton from '@/components/ScanNowButton';
import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const site = await db.select().from(sites).where(eq(sites.id, id)).get();
  if (!site) notFound();

  const recentScans = await db
    .select()
    .from(scans)
    .where(eq(scans.siteId, id))
    .orderBy(desc(scans.startedAt))
    .limit(30)
    .all();

  const trendData = recentScans
    .slice()
    .reverse()
    .filter((s) => s.status === 'done')
    .map((s) => ({
      date: new Date(s.startedAt * 1000).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
      }),
      violations: s.violationCount,
    }));

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/sites" className="hover:text-gray-600">
              Sites
            </Link>
            <span>/</span>
            <span className="text-gray-700">{site.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 mt-0.5 inline-block"
          >
            {site.url}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <ScanNowButton siteId={site.id} />
        </div>
      </div>

      {/* Site info */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Schedule</p>
          <p className="text-sm font-mono text-gray-700 mt-1">{site.cronSchedule}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Alert threshold</p>
          <p className="text-sm text-gray-700 mt-1">{site.alertThreshold} violations</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Alert email</p>
          <p className="text-sm text-gray-700 mt-1 truncate">{site.alertEmail ?? '—'}</p>
        </div>
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Violation trend (last 30 scans)</h2>
        <TrendChart data={trendData} />
      </div>

      {/* Scan history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Scan history</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentScans.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-500 text-center">No scans yet.</p>
          ) : (
            recentScans.map((scan) => (
              <div key={scan.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <Link
                    href={`/scans/${scan.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    {new Date(scan.startedAt * 1000).toLocaleString()}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Triggered by: {scan.triggeredBy}
                    {scan.completedAt &&
                      ` · Duration: ${scan.completedAt - scan.startedAt}s`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {scan.violationCount} violations
                  </span>
                  <ScanStatusBadge status={scan.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
