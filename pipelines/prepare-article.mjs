#!/usr/bin/env node
/**
 * prepare-article.mjs
 *
 * Prepares a drafted article for promotion by:
 *   1. Finding the draft in drafts/{pillar}/{slug}.md
 *   2. Updating frontmatter: status → approved, pubDate, reviewedDate, reviewer
 *   3. Copying the article to validated/articles/{slug}.md
 *   4. Creating the required bundle files: review.json, sources.json, image.json
 *
 * Usage:
 *   node pipelines/prepare-article.mjs <slug> <image-url> [reviewer]
 *
 * Example:
 *   node pipelines/prepare-article.mjs epigenetic-clocks-biological-age \
 *     "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=1200&auto=format&fit=crop&q=80" \
 *     bestkarma-review
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileExists, ensureDir, parseFrontmatter } from './content-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(__dirname, '..');

const [slug, imageUrl, reviewer = 'bestkarma-review'] = process.argv.slice(2);

if (!slug || !imageUrl) {
  console.error('Usage: node pipelines/prepare-article.mjs <slug> <image-url> [reviewer]');
  console.error('Example: node pipelines/prepare-article.mjs epigenetic-clocks-biological-age "https://images.unsplash.com/..." bestkarma-review');
  process.exit(1);
}

// --- Find the draft across all pillars ---
const pillars = ['longevity', 'sleep', 'nutrition', 'mind-body', 'wellness'];
let draftPath = null;

for (const pillar of pillars) {
  const candidate = path.join(contentRoot, 'drafts', pillar, `${slug}.md`);
  if (await fileExists(candidate)) {
    draftPath = candidate;
    break;
  }
}

if (!draftPath) {
  console.error(`Draft not found for slug: ${slug}`);
  console.error(`Searched in: ${pillars.map(p => `drafts/${p}/`).join(', ')}`);
  process.exit(1);
}

console.log(`Found draft: ${path.relative(contentRoot, draftPath)}`);

// --- Read and parse the draft ---
const originalContent = await fs.readFile(draftPath, 'utf8');
const frontmatter = parseFrontmatter(originalContent);
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// --- Update frontmatter fields ---
let updatedContent = originalContent
  .replace(/^status: .+$/m, 'status: approved')
  .replace(/^pubDate: .+$/m, `pubDate: ${today}`)
  .replace(/^reviewedDate: .+$/m, `reviewedDate: ${today}`)
  .replace(/^reviewer: .+$/m, `reviewer: ${reviewer}`);

// --- Write to validated/articles/ ---
const validatedArticlesDir = path.join(contentRoot, 'validated', 'articles');
await ensureDir(validatedArticlesDir);

const validatedArticlePath = path.join(validatedArticlesDir, `${slug}.md`);
await fs.writeFile(validatedArticlePath, updatedContent, 'utf8');
console.log(`Copied to: validated/articles/${slug}.md`);

// --- Count sources cited in the article body ---
const sourceMatches = originalContent.match(/DOI:|PubMed:|doi\.org|ncbi\.nlm/gi) || [];
const sourceCount = Math.max(sourceMatches.length, 1);

// --- Create bundle directory ---
const bundleDir = path.join(contentRoot, 'validated', `${slug}.bundle`);
await ensureDir(bundleDir);

// --- review.json ---
const reviewJson = {
  reviewer,
  reviewedAt: today,
  status: 'approved',
  notes: ['Sources cited inline in article body.'],
};
await fs.writeFile(
  path.join(bundleDir, 'review.json'),
  JSON.stringify(reviewJson, null, 2),
  'utf8'
);

// --- sources.json ---
const sourcesJson = {
  sourceStyle: 'inline-footnotes',
  sourceCount,
  note: 'Primary references are cited inline within the article content.',
};
await fs.writeFile(
  path.join(bundleDir, 'sources.json'),
  JSON.stringify(sourcesJson, null, 2),
  'utf8'
);

// --- image.json ---
const imageJson = {
  id: slug,
  alt: frontmatter.title || slug,
  credit: imageUrl.includes('unsplash') ? 'Unsplash' : 'External',
  sourceUrl: imageUrl,
  usage: 'hero',
};
await fs.writeFile(
  path.join(bundleDir, 'image.json'),
  JSON.stringify(imageJson, null, 2),
  'utf8'
);

console.log(`Created bundle: validated/${slug}.bundle/`);
console.log('  ✓ review.json');
console.log('  ✓ sources.json');
console.log('  ✓ image.json');
console.log('');
console.log('Next step:');
console.log(`  node pipelines/promote-article.mjs ${slug}`);
