// Honest look at what's actually in the catalog. Used as a one-off
// diagnostic when the discovery surface feels skewed.
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log('=== Catalog by media type ===');
  const byMedium = await sql`
    SELECT media_type, COUNT(*)::int AS count
    FROM titles
    GROUP BY media_type
    ORDER BY count DESC
  `;
  console.table(byMedium);

  console.log('\n=== Catalog by release decade ===');
  const byDecade = await sql`
    SELECT
      CASE
        WHEN release_year IS NULL THEN 'unknown'
        ELSE (release_year / 10 * 10)::text || 's'
      END AS decade,
      COUNT(*)::int AS count
    FROM titles
    GROUP BY decade
    ORDER BY decade
  `;
  console.table(byDecade);

  console.log('\n=== Catalog by medium × decade (top combos) ===');
  const byMediumDecade = await sql`
    SELECT
      media_type,
      CASE
        WHEN release_year IS NULL THEN 'unknown'
        ELSE (release_year / 10 * 10)::text || 's'
      END AS decade,
      COUNT(*)::int AS count
    FROM titles
    GROUP BY media_type, decade
    ORDER BY count DESC
    LIMIT 25
  `;
  console.table(byMediumDecade);

  console.log('\n=== Top 10 by popularity, by medium ===');
  const tv = await sql`
    SELECT title, release_year, popularity_score::float AS pop
    FROM titles
    WHERE media_type = 'tv'
    ORDER BY popularity_score DESC NULLS LAST LIMIT 10
  `;
  console.log('--- TV ---');
  console.table(tv);
  const film = await sql`
    SELECT title, release_year, popularity_score::float AS pop
    FROM titles
    WHERE media_type = 'film'
    ORDER BY popularity_score DESC NULLS LAST LIMIT 10
  `;
  console.log('--- Film ---');
  console.table(film);
  const anime = await sql`
    SELECT title, release_year, popularity_score::float AS pop
    FROM titles
    WHERE media_type = 'anime'
    ORDER BY popularity_score DESC NULLS LAST LIMIT 10
  `;
  console.log('--- Anime ---');
  console.table(anime);

  console.log('\n=== Tag categories (taxonomy breadth) ===');
  const tagCats = await sql`
    SELECT
      COALESCE(category, '(none)') AS category,
      source,
      COUNT(*)::int AS count
    FROM tags
    GROUP BY category, source
    ORDER BY count DESC
  `;
  console.table(tagCats);

  console.log('\n=== Top tags by usage frequency ===');
  const topTags = await sql`
    SELECT
      t.name,
      t.source,
      COUNT(tt.title_id)::int AS title_count
    FROM tags t
    JOIN title_tags tt ON tt.tag_id = t.id
    GROUP BY t.id, t.name, t.source
    ORDER BY title_count DESC
    LIMIT 30
  `;
  console.table(topTags);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
