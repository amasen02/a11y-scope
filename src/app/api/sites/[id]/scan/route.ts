import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { scans, sites } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const site = await db.select().from(sites).where(eq(sites.id, id)).get();

  if (!site) {
    return Response.json({ error: 'Site not found' }, { status: 404 });
  }

  const scanId = crypto.randomUUID();

  await db.insert(scans)
    .values({
      id: scanId,
      siteId: id,
      status: 'pending',
      triggeredBy: 'manual',
      startedAt: Math.floor(Date.now() / 1000),
      pageUrl: site.url,
    })
    .run();

  // Fire-and-forget: do not await
  setImmediate(async () => {
    try {
      const { scanSite } = await import('@/lib/scanner');
      await scanSite(id, site.url, scanId);
    } catch (err) {
      console.error(`[api] Background scan ${scanId} failed:`, err);
    }
  });

  return Response.json({ scanId, status: 'pending' }, { status: 202 });
}
