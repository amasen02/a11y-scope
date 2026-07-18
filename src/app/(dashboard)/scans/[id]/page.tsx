import { db } from '@/lib/db';
import { scans, sites, violations } from '@/lib/schema';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import ViolationItem from '@/components/ViolationItem';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const IMPACT_ORDER: Record<string, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const scan = await db.select().from(scans).where(eq(scans.id, id)).get();
  if (!scan) notFound();

  const [site, scanViolations] = await Promise.all([
    db.select().from(sites).where(eq(sites.id, scan.siteId)).get(),
    db.select().from(violations).where(eq(violations.scanId, id)).all(),
  ]);

  const sortedViolations = [...scanViolations].sort(
    (a, b) => (IMPACT_ORDER[a.impact] ?? 99) - (IMPACT_ORDER[b.impact] ?? 99)
  );

  // Group by impact
  const groups = ['critical', 'serious', 'moderate', 'minor', 'unknown'] as const;
  const grouped = Object.fromEntries(
    groups.map((g) => [g, sortedViolations.filter((v) => v.impact === g)])
  ) as Record<string, typeof sortedViolations>;

  const impactLabels: Record<string, string> = {
    critical: 'Critical',
    serious: 'Serious',
    moderate: 'Moderate',
    minor: 'Minor',
    unknown: 'Unknown',
  };

  const impactHeaderColors: Record<string, string> = {
    critical: 'text-red-700 bg-red-50 border-red-200',
    serious: 'text-orange-700 bg-orange-50 border-orange-200',
    moderate: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    minor: 'text-blue-700 bg-blue-50 border-blue-200',
    unknown: 'text-gray-700 bg-gray-50 border-gray-200',
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
        {site && (
          <>
            <Link href="/sites" className="hover:text-gray-600">
              Sites
            </Link>
            <span>/</span>
            <Link href={`/sites/${site.id}`} className="hover:text-gray-600">
              {site.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-700">Scan</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Scan Details</h1>

      {/* Metadata */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 font-medium">Status</p>
            <div className="mt-1">
              <ScanStatusBadge status={scan.status} />
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Violations</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{scan.violationCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Started</p>
            <p className="text-sm text-gray-700 mt-1">
              {new Date(scan.startedAt * 1000).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Duration</p>
            <p className="text-sm text-gray-700 mt-1">
              {scan.completedAt
                ? `${scan.completedAt - scan.startedAt}s`
                : scan.status === 'running'
                ? 'In progress…'
                : '—'}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-1">Page URL</p>
          <a
            href={scan.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {scan.pageUrl}
          </a>
        </div>

        {scan.errorMessage && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1">Error</p>
            <p className="text-sm text-red-600">{scan.errorMessage}</p>
          </div>
        )}
      </div>

      {/* Violations grouped by impact */}
      {scan.status === 'done' && sortedViolations.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <p className="text-green-700 font-medium">No violations found!</p>
          <p className="text-green-600 text-sm mt-1">This page passes all tested WCAG 2.2 criteria.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((impact) => {
            const items = grouped[impact];
            if (!items || items.length === 0) return null;

            return (
              <div key={impact}>
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border ${impactHeaderColors[impact]}`}
                >
                  <h2 className="font-semibold text-sm">
                    {impactLabels[impact]} ({items.length})
                  </h2>
                </div>
                <div className="space-y-2 mt-2">
                  {items.map((v) => (
                    <ViolationItem
                      key={v.id}
                      axeId={v.axeId}
                      impact={v.impact}
                      description={v.description}
                      helpUrl={v.helpUrl}
                      wcagCriteria={v.wcagCriteria}
                      nodeSelector={v.nodeSelector}
                      nodeHtml={v.nodeHtml}
                      message={v.message}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
