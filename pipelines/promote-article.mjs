import fs from 'node:fs/promises';
import path from 'node:path';
import { publishedDir, validatedDir } from './content-config.mjs';
import { ensureDir, fileExists } from './content-utils.mjs';

const targetSlug = process.argv[2] || null;

async function promoteSlug(slug) {
  const sourceArticlePath = path.join(validatedDir, `${slug}.md`);
  const targetArticlePath = path.join(publishedDir, `${slug}.md`);
  const sourceBundleDir = path.join(validatedDir, '..', `${slug}.bundle`);
  const targetBundleDir = path.join(publishedDir, '..', `${slug}.bundle`);

  if (!(await fileExists(sourceArticlePath))) {
    console.error(`  ✗ Validated article not found: ${sourceArticlePath}`);
    return false;
  }

  for (const requiredFile of ['sources.json', 'review.json', 'image.json']) {
    const filePath = path.join(sourceBundleDir, requiredFile);
    if (!(await fileExists(filePath))) {
      console.error(`  ✗ Cannot promote ${slug}: missing ${requiredFile} in bundle`);
      return false;
    }
  }

  await ensureDir(publishedDir);
  await ensureDir(targetBundleDir);

  await fs.copyFile(sourceArticlePath, targetArticlePath);
  for (const requiredFile of ['sources.json', 'review.json', 'image.json']) {
    await fs.copyFile(
      path.join(sourceBundleDir, requiredFile),
      path.join(targetBundleDir, requiredFile)
    );
  }

  const optionalFiles = ['video.json'];
  for (const optionalFile of optionalFiles) {
    const optionalPath = path.join(sourceBundleDir, optionalFile);
    if (await fileExists(optionalPath)) {
      await fs.copyFile(optionalPath, path.join(targetBundleDir, optionalFile));
    }
  }

  console.log(`  ✓ Promoted: ${slug}`);
  return true;
}

if (targetSlug) {
  // Single slug mode
  const ok = await promoteSlug(targetSlug);
  process.exit(ok ? 0 : 1);
} else {
  // Bulk mode — promote all validated articles not yet published
  let files;
  try {
    files = await fs.readdir(validatedDir);
  } catch {
    console.log('No validated/articles/ directory found.');
    process.exit(0);
  }

  const slugs = files
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''));

  const unpublished = [];
  for (const slug of slugs) {
    if (!(await fileExists(path.join(publishedDir, `${slug}.md`)))) {
      unpublished.push(slug);
    }
  }

  if (unpublished.length === 0) {
    console.log('Nothing to promote — all validated articles are already published.');
    process.exit(0);
  }

  console.log(`Promoting ${unpublished.length} article(s)...\n`);
  let failed = 0;
  for (const slug of unpublished) {
    const ok = await promoteSlug(slug);
    if (!ok) failed++;
  }

  console.log(`\nDone. ${unpublished.length - failed} promoted, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}
