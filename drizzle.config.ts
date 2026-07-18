import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.startsWith('file:')
        ? process.env.DATABASE_URL
        : `file:${process.env.DATABASE_URL}`
      : 'file:./data/a11yscope.db',
  },
} satisfies Config;
