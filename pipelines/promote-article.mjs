import fs from 'node:fs/promises';
import path from 'node:path';
import { publishedDir, validatedDir } from './content-config.mjs';
import { ensureDir, fileExists } from './content-utils.mjs';

const slug = process.argv[2];

if (!slug) {
  console.error('Usage: npm run content:promote -- <slug>');
  process.exit(1);
}

const sourceArticlePath = path.join(validatedDir, `${slug}.md`);
const targetArticlePath = path.join(publishedDir, `${slug}.md`);
const sourceBundleDir = path.join(validatedDir, '..', `${slug}.bundle`);
const targetBundleDir = path.join(publishedDir, '..', `${slug}.bundle`);

if (!(await fileExists(sourceArticlePath))) {
  console.error(`Validated article not found: ${sourceArticlePath}`);
  process.exit(1);
}

for (const requiredFile of ['sources.json', 'review.json', 'image.json']) {
  const filePath = path.join(sourceBundleDir, requiredFile);
  if (!(await fileExists(filePath))) {
    console.error(`Cannot promote ${slug}: missing ${requiredFile} in ${sourceBundleDir}`);
    process.exit(1);
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

console.log(`Promoted ${slug} to published content.`);
