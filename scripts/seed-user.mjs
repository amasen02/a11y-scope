/**
 * Create an initial admin user in the database.
 * Usage: node scripts/seed-user.mjs [email] [password] [name]
 * Credentials must be supplied; there are deliberately no defaults.
 */

import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../data/a11yscope.db');

if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

// No default credentials. A well-known seeded email and password pair survives into
// deployments and is the first thing an attacker tries.
const email = process.argv[2] ?? process.env.SEED_EMAIL;
const password = process.argv[3] ?? process.env.SEED_PASSWORD;
if (!email || !password) {
  console.error('Usage: node scripts/seed-user.mjs <email> <password> [name]');
  console.error('   or: SEED_EMAIL=... SEED_PASSWORD=... node scripts/seed-user.mjs');
  process.exit(2);
}
if (password.length < 12) {
  console.error('Refusing to seed: choose a password of at least 12 characters.');
  process.exit(2);
}
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
