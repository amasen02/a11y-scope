import { AxeBuilder } from '@axe-core/playwright';
import { eq } from 'drizzle-orm';
import { chromium } from 'playwright';
import { db } from './db';
import { sendAlertEmail } from './email';
import { scans, sites, violations } from './schema';

export async function scanSite(siteId: string, url: string, scanId: string): Promise<void> {
  // Mark scan as running
  await db.update(scans)
    .set({ status: 'running' })
    .where(eq(scans.id, scanId))
    .run();

  let browser = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    // Persist violations
    const violationRows = [];
    for (const violation of results.violations) {
      const wcagCriteria = (violation.tags ?? [])
        .filter((t) => t.startsWith('wcag'))
        .join(', ');

      for (const node of violation.nodes) {
        const nodeSelector = node.target?.join(', ') ?? '';
        const nodeHtml = node.html ?? '';
        const message = node.failureSummary ?? violation.description;

        violationRows.push({
          id: crypto.randomUUID(),
          scanId,
          axeId: violation.id,
          impact: violation.impact ?? 'unknown',
          description: violation.description,
          helpUrl: violation.helpUrl,
          wcagCriteria,
          nodeSelector,
          nodeHtml,
          message,
        });
      }
    }

    if (violationRows.length > 0) {
      await db.insert(violations).values(violationRows).run();
    }

    const violationCount = violationRows.length;

    await db.update(scans)
      .set({
        status: 'done',
        completedAt: Math.floor(Date.now() / 1000),
        violationCount,
      })
      .where(eq(scans.id, scanId))
      .run();

    console.log(`[scanner] Scan ${scanId} completed: ${violationCount} violations on ${url}`);

    // Check alert threshold
    const site = await db.select().from(sites).where(eq(sites.id, siteId)).get();
    if (
      site &&
      site.alertEmail &&
      site.alertThreshold !== null &&
      violationCount >= site.alertThreshold
    ) {
      await sendAlertEmail({
        to: site.alertEmail,
        siteName: site.name,
        siteUrl: site.url,
        violationCount,
        threshold: site.alertThreshold,
        scanId,
      });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[scanner] Scan ${scanId} failed:`, errorMessage);

    await db.update(scans)
      .set({
        status: 'failed',
        completedAt: Math.floor(Date.now() / 1000),
        errorMessage,
      })
      .where(eq(scans.id, scanId))
      .run();
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
