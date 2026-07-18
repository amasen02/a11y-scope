/**
 * Create an initial admin user in the database.
 * Usage: node scripts/seed-user.mjs [email] [password] [name]
 * Defaults: admin@example.com / admin123 / Admin
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { createHash, randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../data/a11yscope.db');

if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const email = process.argv[2] ?? 'admin@example.com';
const password = process.argv[3] ?? 'admin123';
const name = process.argv[4] ?? 'Admin';

// Simple bcrypt-compatible hash using Node crypto (for seeding only)
// In production the app uses bcryptjs properly
const { default: bcrypt } = await import('bcryptjs');

const client = createClient({ url: `file:${dbPath}` });

// Ensure users table exists
await client.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);

// Check if user already exists
const existing = await client.execute({
  sql: 'SELECT id FROM users WHERE email = ?',
  args: [email],
});

if (existing.rows.length > 0) {
  console.log(`User ${email} already exists.`);
  process.exit(0);
}

const passwordHash = await bcrypt.hash(password, 12);
const id = randomUUID();

await client.execute({
  sql: 'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
  args: [id, email, passwordHash, name],
});

console.log(`✓ Created user:`);
console.log(`  Email:    ${email}`);
console.log(`  Password: ${password}`);
console.log(`  Name:     ${name}`);
