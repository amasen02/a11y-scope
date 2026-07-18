import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { scans, sites } from '@/lib/schema';
import { desc, eq, sql } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allSites = await db.select().from(sites).orderBy(desc(sites.createdAt)).all();

  const sitesWithStats = await Promise.all(
    allSites.map(async (site) => {
      const latestScanRows = await db
        .select()
        .from(scans)
        .where(eq(scans.siteId, site.id))
        .orderBy(desc(scans.startedAt))
        .limit(1)
        .all();

      const countRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(scans)
        .where(eq(scans.siteId, site.id))
        .all();

      return {
        ...site,
        latestScan: latestScanRows[0] ?? null,
        totalScans: countRows[0]?.count ?? 0,
      };
    })
  );

  return Response.json(sitesWithStats);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, url, cronSchedule, alertThreshold, alertEmail } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return Response.json({ error: 'Site name is required' }, { status: 400 });
  }

  if (!url || typeof url !== 'string') {
    return Response.json({ error: 'Site URL is required' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return Response.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  const rows = await db
    .insert(sites)
    .values({
      id,
      name: name.trim(),
      url: url.trim(),
      cronSchedule: cronSchedule ?? '0 2 * * *',
      alertThreshold: alertThreshold ?? 10,
      alertEmail: alertEmail?.trim() || null,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .all();

  const newSite = rows[0];

  // Register with scheduler
  const { scheduleJob } = await import('@/lib/scheduler');
  scheduleJob(id, newSite.cronSchedule);

  return Response.json(newSite, { status: 201 });
}
