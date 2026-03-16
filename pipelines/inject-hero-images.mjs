#!/usr/bin/env node
/**
 * inject-hero-images.mjs
 *
 * One-time script: reads image.json from each published bundle and injects
 * the sourceUrl as heroImage into the corresponding article frontmatter.
 *
 * Usage: node pipelines/inject-hero-images.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileExists } from './content-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(__dirname, '..');
const publishedArticlesDir = path.join(contentRoot, 'published', 'articles');

const files = await fs.readdir(publishedArticlesDir);
const articles = files.filter(f => f.endsWith('.md'));

let updated = 0;
let skipped = 0;

for (const filename of articles) {
  const slug = filename.replace(/\.md$/, '');
  const articlePath = path.join(publishedArticlesDir, filename);
  const imagePath = path.join(contentRoot, 'published', `${slug}.bundle`, 'image.json');

  if (!(await fileExists(imagePath))) {
    console.log(`  skip ${slug} — no image.json`);
    skipped++;
    continue;
  }

  const imageJson = JSON.parse(await fs.readFile(imagePath, 'utf8'));
  const heroImage = imageJson.sourceUrl;

  if (!heroImage) {
    console.log(`  skip ${slug} — no sourceUrl in image.json`);
    skipped++;
    continue;
  }

  let content = await fs.readFile(articlePath, 'utf8');

  // Already has heroImage? Update it. Otherwise inject after reviewedDate line.
  if (/^heroImage:/m.test(content)) {
    content = content.replace(/^heroImage:.*$/m, `heroImage: "${heroImage}"`);
  } else {
    // Inject after reviewedDate
    content = content.replace(
      /^(reviewedDate:.+)$/m,
      `$1\nheroImage: "${heroImage}"`
    );
  }

  await fs.writeFile(articlePath, content, 'utf8');
  console.log(`  ✓ ${slug}`);
  updated++;
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped.`);
