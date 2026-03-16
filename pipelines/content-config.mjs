import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const contentRoot = path.resolve(__dirname, '..');
export const draftsDir = path.join(contentRoot, 'drafts');
export const validatedDir = path.join(contentRoot, 'validated', 'articles');
export const publishedDir = path.join(contentRoot, 'published', 'articles');

export const allowedCategories = new Set([
  'longevity',
  'nutrition',
  'sleep',
  'wellness',
  'mind-body',
]);

export const allowedStatuses = new Set([
  'briefed',
  'researched',
  'drafted',
  'validated',
  'approved',
  'published',
]);

export const requiredFrontmatterFields = [
  'title',
  'description',
  'author',
  'reviewer',
  'pubDate',
  'reviewedDate',
  'category',
  'tags',
  'readTime',
  'status',
];
