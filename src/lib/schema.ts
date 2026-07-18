import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
});

export const sites = sqliteTable('sites', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  cronSchedule: text('cron_schedule').notNull().default('0 2 * * *'),
  alertThreshold: integer('alert_threshold').notNull().default(10),
  alertEmail: text('alert_email'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
});

export const scans = sqliteTable('scans', {
  id: text('id').primaryKey(),
  siteId: text('site_id')
    .notNull()
    .references(() => sites.id),
  status: text('status', { enum: ['pending', 'running', 'done', 'failed'] })
    .notNull()
    .default('pending'),
  triggeredBy: text('triggered_by', { enum: ['cron', 'manual', 'webhook'] })
    .notNull()
    .default('manual'),
  startedAt: integer('started_at').notNull().default(sql`(unixepoch())`),
  completedAt: integer('completed_at'),
  violationCount: integer('violation_count').notNull().default(0),
  errorMessage: text('error_message'),
  pageUrl: text('page_url').notNull(),
});

export const violations = sqliteTable('violations', {
  id: text('id').primaryKey(),
  scanId: text('scan_id')
    .notNull()
    .references(() => scans.id),
  axeId: text('axe_id').notNull(),
  impact: text('impact').notNull(),
  description: text('description').notNull(),
  helpUrl: text('help_url').notNull(),
  wcagCriteria: text('wcag_criteria').notNull(),
  nodeSelector: text('node_selector').notNull(),
  nodeHtml: text('node_html').notNull(),
  message: text('message').notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;
export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;
export type Violation = typeof violations.$inferSelect;
export type NewViolation = typeof violations.$inferInsert;
