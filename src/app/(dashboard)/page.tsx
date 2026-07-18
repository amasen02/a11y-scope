import { db } from '@/lib/db';
import { scans, sites, violations } from '@/lib/schema';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { desc, sql } from 'drizzle-orm';
import Link from 'next/link';

export default async function OverviewPage() {
  const [totalSitesRows, totalScansRows, totalViolationsRows, recentScans, allSites] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(sites).all(),
      db.select({ count: sql<number>`count(*)` }).from(scans).all(),
      db.select({ count: sql<number>`count(*)` }).from(violations).all(),
      db.select().from(scans).orderBy(desc(scans.startedAt)).limit(10).all(),
      db.select().from(sites).all(),
    ]);

  const siteMap = new Map(allSites.map((s) => [s.id, s]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Sites', value: totalSitesRows[0]?.count ?? 0 },
          { label: 'Total Scans', value: totalScansRows[0]?.count ?? 0 },
          { label: 'Total Violations', value: totalViolationsRows[0]?.count ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Recent scans */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Scans</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentScans.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-500 text-center">No scans yet.</p>
          ) : (
            recentScans.map((scan) => {
              const site = siteMap.get(scan.siteId);
              return (
                <div key={scan.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <Link
                      href={`/scans/${scan.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 truncate block"
                    >
                      {site?.name ?? scan.pageUrl}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(scan.startedAt * 1000).toLocaleString()} · {scan.triggeredBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="text-sm text-gray-500">{scan.violationCount} violations</span>
                    <ScanStatusBadge status={scan.status} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
