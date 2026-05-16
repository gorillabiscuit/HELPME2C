// Pre-flight DB state check before applying migration 0018.
// Run: pnpm dlx tsx --env-file=.env.local scripts/smoke-v4-precheck.ts

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main(): Promise<void> {
  const tablesExist = (await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('title_descriptors', 'title_comparable_titles')
    ORDER BY table_name
  `) as Array<{ table_name: string }>;

  console.log('New tables present:');
  if (tablesExist.length === 0) {
    console.log('  (none — migration not yet applied)');
  } else {
    for (const r of tablesExist) console.log(`  ✓ ${r.table_name}`);
  }

  const titleThemesCols = (await sql`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'title_themes'
    ORDER BY ordinal_position
  `) as Array<{
    column_name: string;
    data_type: string;
    column_default: string | null;
    is_nullable: string;
  }>;

  console.log('\ntitle_themes columns:');
  for (const c of titleThemesCols) {
    console.log(
      `  ${c.column_name.padEnd(20)} ${c.data_type.padEnd(30)} default=${c.column_default ?? '(none)'} null=${c.is_nullable}`,
    );
  }

  const themeCount = (await sql`SELECT COUNT(*)::int AS n FROM title_themes`) as Array<{
    n: number;
  }>;
  console.log(`\nExisting title_themes row count: ${themeCount[0]?.n ?? 0}`);

  const journal = (
    await sql`
    SELECT hash, created_at FROM "drizzle"."__drizzle_migrations" ORDER BY id DESC LIMIT 5
  `
  ).catch(() => []);
  console.log(`\nLast applied migrations (top 5):`);
  if (Array.isArray(journal) && journal.length > 0) {
    for (const j of journal as Array<{ hash: string; created_at: number }>) {
      console.log(`  ${j.hash.slice(0, 12)}  ${new Date(j.created_at).toISOString()}`);
    }
  } else {
    console.log('  (drizzle migrations table not found — possibly first run)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
