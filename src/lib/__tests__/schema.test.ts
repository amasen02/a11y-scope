import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import * as schema from '../schema';

describe('Database schema', () => {
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    const client = createClient({ url: ':memory:' });
    db = drizzle(client, { schema });

    // Create tables
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        cron_schedule TEXT NOT NULL DEFAULT '0 2 * * *',
        alert_threshold INTEGER NOT NULL DEFAULT 10,
        alert_email TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL REFERENCES sites(id),
        status TEXT NOT NULL DEFAULT 'pending',
        triggered_by TEXT NOT NULL DEFAULT 'manual',
        started_at INTEGER NOT NULL DEFAULT (unixepoch()),
        completed_at INTEGER,
        violation_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        page_url TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS violations (
        id TEXT PRIMARY KEY,
        scan_id TEXT NOT NULL REFERENCES scans(id),
        axe_id TEXT NOT NULL,
        impact TEXT NOT NULL,
        description TEXT NOT NULL,
        help_url TEXT NOT NULL,
        wcag_criteria TEXT NOT NULL,
        node_selector TEXT NOT NULL,
        node_html TEXT NOT NULL,
        message TEXT NOT NULL
      );
    `);
  });

  it('can insert and retrieve a user', async () => {
    const userId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.insert(schema.users).values({
      id: userId,
      email: 'test@example.com',
      passwordHash: 'hashed',
      name: 'Test User',
      createdAt: now,
    }).run();

    const allUsers = await db.select().from(schema.users).all();
    const retrieved = allUsers.find((u) => u.id === userId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.email).toBe('test@example.com');
    expect(retrieved?.name).toBe('Test User');
  });

  it('can insert and retrieve a site', async () => {
    const siteId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.insert(schema.sites).values({
      id: siteId,
      name: 'Test Site',
      url: 'https://example.com',
      cronSchedule: '0 2 * * *',
      alertThreshold: 10,
      alertEmail: null,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    }).run();

    const allSites = await db.select().from(schema.sites).all();
    const retrieved = allSites.find((s) => s.id === siteId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Test Site');
    expect(retrieved?.url).toBe('https://example.com');
    expect(retrieved?.cronSchedule).toBe('0 2 * * *');
  });

  it('can insert a scan linked to a site', async () => {
    const siteId = crypto.randomUUID();
    const scanId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.insert(schema.sites).values({
      id: siteId,
      name: 'Scan Test Site',
      url: 'https://scan.example.com',
      cronSchedule: '0 2 * * *',
      alertThreshold: 5,
      alertEmail: 'alert@example.com',
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    }).run();

    await db.insert(schema.scans).values({
      id: scanId,
      siteId,
      status: 'done',
      triggeredBy: 'manual',
      startedAt: now,
      completedAt: now + 5,
      violationCount: 3,
      errorMessage: null,
      pageUrl: 'https://scan.example.com',
    }).run();

    const allScans = await db.select().from(schema.scans).all();
    const retrieved = allScans.find((s) => s.id === scanId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.status).toBe('done');
    expect(retrieved?.violationCount).toBe(3);
    expect(retrieved?.siteId).toBe(siteId);
  });
});
