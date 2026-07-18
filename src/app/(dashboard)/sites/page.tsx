import { db } from '@/lib/db';
import { scans, sites } from '@/lib/schema';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import ScanNowButton from '@/components/ScanNowButton';
import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';

export default async function SitesPage() {
  const allSites = await db.select().from(sites).orderBy(desc(sites.createdAt)).all();

  const sitesWithLatest = await Promise.all(
    allSites.map(async (site) => {
      const latestRows = await db
        .select()
        .from(scans)
        .where(eq(scans.siteId, site.id))
        .orderBy(desc(scans.startedAt))
        .limit(1)
        .all();

      return { ...site, latestScan: latestRows[0] ?? null };
    })
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
        <Link
          href="/sites/new"
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          Add site
        </Link>
      </div>

      {sitesWithLatest.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm">No sites added yet.</p>
          <Link
            href="/sites/new"
            className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700"
          >
            Add your first site →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Site
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Last Scan
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Violations
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sitesWithLatest.map(({ latestScan, ...site }) => (
                <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      href={`/sites/${site.id}`}
                      className="font-medium text-sm text-gray-900 hover:text-blue-600"
                    >
                      {site.name}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{site.url}</p>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {latestScan
                      ? new Date(latestScan.startedAt * 1000).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">
                    {latestScan ? latestScan.violationCount : '—'}
                  </td>
                  <td className="px-5 py-3">
                    {latestScan ? (
                      <ScanStatusBadge status={latestScan.status} />
                    ) : (
                      <span className="text-xs text-gray-400">No scans</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <ScanNowButton siteId={site.id} />
                      <Link
                        href={`/sites/${site.id}`}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
