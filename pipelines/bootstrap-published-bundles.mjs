import fs from 'node:fs/promises';
import path from 'node:path';
import { publishedDir } from './content-config.mjs';
import { ensureDir, getMarkdownFiles, parseFrontmatter, slugFromPath } from './content-utils.mjs';

function countFootnotes(contents) {
  const ids = new Set();
  for (const match of contents.matchAll(/\[\^([^\]]+)\]/g)) {
    ids.add(match[1]);
  }
  return ids.size;
}

const files = await getMarkdownFiles(publishedDir);

for (const filePath of files) {
  const contents = await fs.readFile(filePath, 'utf8');
  const frontmatter = parseFrontmatter(contents);
  const slug = slugFromPath(filePath);
  const bundleDir = path.join(publishedDir, '..', `${slug}.bundle`);
  const footnoteCount = countFootnotes(contents);

  await ensureDir(bundleDir);

  const reviewPayload = {
    reviewer: frontmatter.reviewer ?? 'bestkarma-review',
    reviewedAt: frontmatter.reviewedDate ?? frontmatter.pubDate,
    status: 'approved',
    notes: [
      'Legacy article migrated into the content-system review bundle.',
      'Primary references remain cited inline in the article body.'
    ]
  };

  const imagePayload = {
    id: slug,
    alt: frontmatter.title,
    credit: 'Source image referenced in article metadata',
    sourceUrl: frontmatter.heroImage ?? '',
    usage: 'hero'
  };

  const sourcesPayload = {
    sourceStyle: 'inline-footnotes',
    sourceCount: footnoteCount,
    note: 'Primary references are cited inline within the article content.'
  };

  await fs.writeFile(path.join(bundleDir, 'review.json'), `${JSON.stringify(reviewPayload, null, 2)}\n`);
  await fs.writeFile(path.join(bundleDir, 'image.json'), `${JSON.stringify(imagePayload, null, 2)}\n`);
  await fs.writeFile(path.join(bundleDir, 'sources.json'), `${JSON.stringify(sourcesPayload, null, 2)}\n`);
}

console.log(`Bootstrapped bundles for ${files.length} published article(s).`);
