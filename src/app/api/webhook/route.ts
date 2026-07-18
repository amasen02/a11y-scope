import { db } from '@/lib/db';
import { scans, sites } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.url !== 'string') {
    return Response.json({ error: 'Request body must include a "url" field' }, { status: 400 });
  }

  const targetUrl = body.url.trim();

  try {
    new URL(targetUrl);
  } catch {
    return Response.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  // Find existing site by URL or create a new one
  let site = await db.select().from(sites).where(eq(sites.url, targetUrl)).get();

  if (!site) {
    const siteName =
      typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : new URL(targetUrl).hostname;

    const siteId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const rows = await db
      .insert(sites)
      .values({
        id: siteId,
        name: siteName,
        url: targetUrl,
        cronSchedule: '0 2 * * *',
        alertThreshold: 10,
        alertEmail: null,
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .all();

    site = rows[0];

    const { scheduleJob } = await import('@/lib/scheduler');
    scheduleJob(site.id, site.cronSchedule);
  }

  const scanId = crypto.randomUUID();

  await db.insert(scans)
    .values({
      id: scanId,
      siteId: site.id,
      status: 'pending',
      triggeredBy: 'webhook',
      startedAt: Math.floor(Date.now() / 1000),
      pageUrl: targetUrl,
    })
    .run();

  const capturedSite = site;

  setImmediate(async () => {
    try {
      const { scanSite } = await import('@/lib/scanner');
      await scanSite(capturedSite.id, targetUrl, scanId);
    } catch (err) {
      console.error(`[webhook] Background scan ${scanId} failed:`, err);
    }
  });

  return Response.json({ scanId, siteId: site.id, status: 'pending' }, { status: 202 });
}
