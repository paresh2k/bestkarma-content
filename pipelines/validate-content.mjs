import fs from 'node:fs/promises';
import path from 'node:path';
import {
  allowedCategories,
  allowedStatuses,
  publishedDir,
  requiredFrontmatterFields,
  validatedDir,
} from './content-config.mjs';
import {
  fileExists,
  getMarkdownFiles,
  parseFrontmatter,
  readJson,
  slugFromPath,
} from './content-utils.mjs';

const mode = process.argv[2] || 'all';

function validateFrontmatter(frontmatter, slug, bucket) {
  const errors = [];
  const warnings = [];

  for (const field of requiredFrontmatterFields) {
    if (frontmatter[field] === undefined || frontmatter[field] === '') {
      errors.push(`${bucket}/${slug}: missing required frontmatter field "${field}"`);
    }
  }

  if (frontmatter.category && !allowedCategories.has(frontmatter.category)) {
    errors.push(`${bucket}/${slug}: invalid category "${frontmatter.category}"`);
  }

  if (frontmatter.status && !allowedStatuses.has(frontmatter.status)) {
    errors.push(`${bucket}/${slug}: invalid status "${frontmatter.status}"`);
  }

  if (frontmatter.tags && !Array.isArray(frontmatter.tags)) {
    errors.push(`${bucket}/${slug}: tags must be an array`);
  }

  if (frontmatter.readTime && (!Number.isInteger(frontmatter.readTime) || frontmatter.readTime < 1)) {
    errors.push(`${bucket}/${slug}: readTime must be a positive integer`);
  }

  if (frontmatter.description && String(frontmatter.description).length < 30) {
    warnings.push(`${bucket}/${slug}: description is shorter than 30 characters`);
  }

  if (frontmatter.heroImage && String(frontmatter.heroImage).startsWith('http')) {
    warnings.push(`${bucket}/${slug}: heroImage uses an external URL; local managed assets are preferred`);
  }

  return { errors, warnings };
}

async function validateBundleMetadata(bucketDir, slug, required) {
  const metadataDir = path.join(bucketDir, '..', `${slug}.bundle`);
  const sourcesPath = path.join(metadataDir, 'sources.json');
  const reviewPath = path.join(metadataDir, 'review.json');
  const imagePath = path.join(metadataDir, 'image.json');
  const videoPath = path.join(metadataDir, 'video.json');
  const errors = [];
  const warnings = [];

  const hasSources = await fileExists(sourcesPath);
  const hasReview = await fileExists(reviewPath);
  const hasImage = await fileExists(imagePath);
  const hasVideo = await fileExists(videoPath);

  if (required && !hasSources) errors.push(`${slug}: missing sources.json bundle metadata`);
  if (required && !hasReview) errors.push(`${slug}: missing review.json bundle metadata`);
  if (required && !hasImage) errors.push(`${slug}: missing image.json bundle metadata`);

  if (!required && (!hasSources || !hasReview || !hasImage)) {
    warnings.push(`${slug}: legacy published article is missing one or more bundle metadata files`);
  }

  if (hasVideo) {
    warnings.push(`${slug}: video.json present; ensure social hooks were reviewed before posting`);
  }

  for (const [label, filePath] of [
    ['sources.json', sourcesPath],
    ['review.json', reviewPath],
    ['image.json', imagePath],
    ['video.json', videoPath],
  ]) {
    if (!(await fileExists(filePath))) continue;
    try {
      await readJson(filePath);
    } catch (error) {
      errors.push(`${slug}: ${label} is not valid JSON (${error.message})`);
    }
  }

  return { errors, warnings };
}

async function validateDirectory(bucketName, dirPath, requireBundles) {
  const files = await getMarkdownFiles(dirPath);
  const errors = [];
  const warnings = [];

  for (const filePath of files) {
    const slug = slugFromPath(filePath);
    const contents = await fs.readFile(filePath, 'utf8');

    let frontmatter;
    try {
      frontmatter = parseFrontmatter(contents);
    } catch (error) {
      errors.push(`${bucketName}/${slug}: ${error.message}`);
      continue;
    }

    const frontmatterValidation = validateFrontmatter(frontmatter, slug, bucketName);
    errors.push(...frontmatterValidation.errors);
    warnings.push(...frontmatterValidation.warnings);

    const bundleValidation = await validateBundleMetadata(dirPath, slug, requireBundles);
    errors.push(...bundleValidation.errors.map((message) => `${bucketName}/${message}`));
    warnings.push(...bundleValidation.warnings.map((message) => `${bucketName}/${message}`));
  }

  return { filesCount: files.length, errors, warnings };
}

const tasks = [];
if (mode === 'all' || mode === 'published') {
  tasks.push(validateDirectory('published', publishedDir, true));
}
if (mode === 'all' || mode === 'validated') {
  tasks.push(validateDirectory('validated', validatedDir, true));
}

const results = await Promise.all(tasks);
const errors = results.flatMap((result) => result.errors);
const warnings = results.flatMap((result) => result.warnings);
const filesCount = results.reduce((total, result) => total + result.filesCount, 0);

if (warnings.length > 0) {
  console.warn('Warnings:');
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (errors.length > 0) {
  console.error('Validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Validated ${filesCount} article(s) with no blocking errors.`);
}
