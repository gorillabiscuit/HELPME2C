import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// drizzle-kit only reads .env by default; load .env.local explicitly.
config({ path: '.env.local' });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    // Use the direct (unpooled) connection for migrations — the pooler can block DDL.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
});
