import cron from 'node-cron';
import { db } from './db';
import { scans, sites } from './schema';

const scheduledJobs = new Map<string, cron.ScheduledTask>();

export async function startScheduler(): Promise<void> {
  console.log('[scheduler] Starting...');

  const activeSites = (await db.select().from(sites).all()).filter((s) => s.isActive === 1);

  for (const site of activeSites) {
    scheduleJob(site.id, site.cronSchedule);
  }

  console.log(`[scheduler] Scheduled ${activeSites.length} site(s).`);
}

export function scheduleJob(siteId: string, schedule: string): void {
  unscheduleJob(siteId);

  if (!cron.validate(schedule)) {
    console.warn(`[scheduler] Invalid cron expression "${schedule}" for site ${siteId}`);
    return;
  }

  const task = cron.schedule(schedule, async () => {
    const allSites = await db.select().from(sites).all();
    const site = allSites.find((s) => s.id === siteId);
    if (!site || site.isActive !== 1) {
      return;
    }

    const { scanSite } = await import('./scanner');
    const scanId = crypto.randomUUID();

    await db.insert(scans)
      .values({
        id: scanId,
        siteId,
        status: 'pending',
        triggeredBy: 'cron',
        startedAt: Math.floor(Date.now() / 1000),
        pageUrl: site.url,
      })
      .run();

    console.log(`[scheduler] Triggering cron scan ${scanId} for site ${siteId}`);

    scanSite(siteId, site.url, scanId).catch((err) => {
      console.error(`[scheduler] Background scan ${scanId} error:`, err);
    });
  });

  scheduledJobs.set(siteId, task);
  console.log(`[scheduler] Scheduled site ${siteId} with cron "${schedule}"`);
}

export function unscheduleJob(siteId: string): void {
  const existing = scheduledJobs.get(siteId);
  if (existing) {
    existing.stop();
    scheduledJobs.delete(siteId);
    console.log(`[scheduler] Unscheduled site ${siteId}`);
  }
}
