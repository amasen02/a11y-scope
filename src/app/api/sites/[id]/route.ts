import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { scans, sites, violations } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { assertPublicUrl } from '@/lib/url-safety';

export async function GET(
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

  return Response.json(site);
}

export async function PATCH(
  request: Request,
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

  const body = await request.json();
  const { name, url, cronSchedule, alertThreshold, alertEmail, isActive } = body;

  const updates: Partial<typeof site> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };

  if (name !== undefined) updates.name = String(name).trim();
  if (url !== undefined) {
    if (typeof url !== 'string') {
      return Response.json({ error: 'Site URL must be a string' }, { status: 400 });
    }
    // Editing the URL is another way to aim the scanner's headless browser, so it runs the
    // same private-range guard as POST /api/sites. `new URL()` alone accepts
    // http://169.254.169.254/ and http://127.0.0.1:6379/.
    const check = await assertPublicUrl(url.trim());
    if (!check.ok) {
      return Response.json({ error: check.reason }, { status: 400 });
    }
    updates.url = url.trim();
  }
  if (cronSchedule !== undefined) updates.cronSchedule = String(cronSchedule);
  if (alertThreshold !== undefined) updates.alertThreshold = Number(alertThreshold);
  if (alertEmail !== undefined) updates.alertEmail = alertEmail ? String(alertEmail).trim() : null;
  if (isActive !== undefined) updates.isActive = isActive ? 1 : 0;

  const rows = await db
    .update(sites)
    .set(updates)
    .where(eq(sites.id, id))
    .returning()
    .all();

  const updated = rows[0];

  // Re-schedule if cron changed or isActive changed
  if (cronSchedule !== undefined || isActive !== undefined) {
    const { scheduleJob, unscheduleJob } = await import('@/lib/scheduler');
    if (updated.isActive === 1) {
      scheduleJob(id, updated.cronSchedule);
    } else {
      unscheduleJob(id);
    }
  }

  return Response.json(updated);
}

export async function DELETE(
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

  // Cascade delete violations, then scans, then site
  const siteScans = await db.select().from(scans).where(eq(scans.siteId, id)).all();
  for (const scan of siteScans) {
    await db.delete(violations).where(eq(violations.scanId, scan.id)).run();
  }
  await db.delete(scans).where(eq(scans.siteId, id)).run();
  await db.delete(sites).where(eq(sites.id, id)).run();

  // Unschedule cron job
  const { unscheduleJob } = await import('@/lib/scheduler');
  unscheduleJob(id);

  return Response.json({ success: true });
}
