import { timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { scans, sites } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { assertPublicUrl } from '@/lib/url-safety';

/**
 * CI hook that re-scans a site that is ALREADY registered.
 *
 * This endpoint previously accepted any URL from anyone and, for an unknown URL, created a
 * permanent site row plus a recurring daily cron job that launched a headless browser at it.
 * That combination is a server-side request forgery primitive, an unbounded growth vector,
 * and a way to make a deployment send daily traffic to a third party. Three things changed:
 *
 *  1. A shared secret is required, compared in constant time. If WEBHOOK_SECRET is unset the
 *     endpoint refuses every request rather than silently accepting them.
 *  2. It no longer creates sites or schedules jobs. The URL must already belong to a site a
 *     signed-in user registered, so the reachable set is exactly what an operator chose.
 *  3. The URL is still re-validated against private and link-local ranges, so a hostname that
 *     has since been repointed at an internal address cannot be scanned.
 */

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which would itself leak length.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    // Fail closed. An unset secret must never mean "open to everyone".
    return Response.json(
      { error: 'Webhook is not configured; set WEBHOOK_SECRET to enable it' },
      { status: 503 }
    );
  }

  const provided = request.headers.get('x-webhook-secret') ?? '';
  if (!provided || !secretMatches(provided, expected)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.url !== 'string') {
    return Response.json({ error: 'Request body must include a "url" field' }, { status: 400 });
  }

  const targetUrl = body.url.trim();
  const check = await assertPublicUrl(targetUrl);
  if (!check.ok) {
    return Response.json({ error: check.reason }, { status: 400 });
  }

  const site = await db.select().from(sites).where(eq(sites.url, targetUrl)).get();
  if (!site) {
    // Deliberately does not create the site. Registration is an authenticated action.
    return Response.json(
      { error: 'No registered site matches that URL; add it from the dashboard first' },
      { status: 404 }
    );
  }
  if (!site.isActive) {
    return Response.json({ error: 'Site is not active' }, { status: 409 });
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
