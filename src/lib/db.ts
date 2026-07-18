import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import fs from 'fs';
import path from 'path';
import * as schema from './schema';

function buildDbUrl(): string {
  const raw = process.env.DATABASE_URL ?? './data/a11yscope.db';
  // libsql expects a file:// URL for local files
  if (raw.startsWith('file:') || raw.startsWith('libsql:') || raw.startsWith('http')) {
    return raw;
  }
  const resolved = path.resolve(raw);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return `file:${resolved}`;
}

function createDb() {
  const url = buildDbUrl();
  const client = createClient({ url });
  return drizzle(client, { schema });
}

declare global {
  var __db: ReturnType<typeof createDb> | undefined;
}

const db = globalThis.__db ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__db = db;
}

export { db };
