/**
 * Exports a real-data snapshot from the local jaipurwe_fsianews MariaDB
 * (imported from the production phpMyAdmin dump) into src/data/snapshot.json.
 * The Vercel serverless API serves this snapshot whenever the live MySQL
 * host is unreachable, so production always shows real newsforever.in
 * content instead of demo data.
 *
 * Usage: npx tsx scripts/export-snapshot.ts
 */
import 'dotenv/config';
import { writeFileSync } from 'fs';
import { getPublishedBlogs, getAllCategories, getActiveAds, getActiveTags } from '../src/lib/db';

async function main() {
  const [blogs, categories, ads, tags] = await Promise.all([
    getPublishedBlogs(1000),
    getAllCategories(),
    getActiveAds(),
    getActiveTags(),
  ]);

  if (blogs.length === 0) {
    throw new Error('No blogs returned — is the local MariaDB running with the dump imported?');
  }

  const snapshot = {
    generated_at: new Date().toISOString(),
    source: 'jaipurwe_fsianews production dump',
    blogs,
    categories,
    ads,
    tags,
  };

  writeFileSync('src/data/snapshot.json', JSON.stringify(snapshot));
  console.log(`Snapshot written: ${blogs.length} blogs, ${categories.length} categories, ${ads.length} ads, ${tags.length} tags`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
