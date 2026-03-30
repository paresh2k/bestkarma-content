#!/usr/bin/env node
/**
 * review-social-video.mjs
 *
 * Updates review status for a generated short-form video package.
 *
 * Usage:
 *   node pipelines/review-social-video.mjs <slug> <approved|needs-revision> [reviewer] [note...]
 *
 * Examples:
 *   node pipelines/review-social-video.mjs alcohol-rem-sleep-suppression approved paresh "Hook is accurate; publish-ready."
 *   node pipelines/review-social-video.mjs mouth-taping-sleep-evidence needs-revision editor "Tone is too certain; preserve caveat."
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileExists, readJson } from './content-utils.mjs';
import { publishedDir, validatedDir } from './content-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(__dirname, '..');

const [slug, decision, reviewer = 'human-reviewer', ...noteParts] = process.argv.slice(2);

if (!slug || !decision) {
  console.error('Usage: node pipelines/review-social-video.mjs <slug> <approved|needs-revision> [reviewer] [note...]');
  process.exit(1);
}

if (!['approved', 'needs-revision'].includes(decision)) {
  console.error(`Invalid decision "${decision}". Use "approved" or "needs-revision".`);
  process.exit(1);
}

async function findVideoJsonPath(targetSlug) {
  for (const baseDir of [validatedDir, publishedDir]) {
    const candidate = path.join(baseDir, '..', `${targetSlug}.bundle`, 'video.json');
    if (await fileExists(candidate)) return candidate;
  }
  return null;
}

const videoJsonPath = await findVideoJsonPath(slug);
if (!videoJsonPath) {
  console.error(`No video.json found for slug: ${slug}`);
  process.exit(1);
}

const payload = await readJson(videoJsonPath);
const now = new Date().toISOString();
const note = noteParts.join(' ').trim();

payload.status = decision === 'approved' ? 'approved' : 'needs-review';
payload.review = {
  ...(payload.review || {}),
  reviewedBy: reviewer,
  reviewedAt: now,
  status: decision,
};

if (note) {
  payload.review.notes = Array.isArray(payload.review.notes) ? payload.review.notes : [];
  payload.review.notes.push(note);
}

if (decision !== 'approved') {
  payload.renderAssets = {
    ...(payload.renderAssets || {}),
    videoPath: null,
    coverImagePath: payload.renderAssets?.coverImagePath ?? null,
    subtitlePath: payload.renderAssets?.subtitlePath ?? null,
  };
}

await fs.writeFile(videoJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Updated ${path.relative(contentRoot, videoJsonPath)} → ${decision}`);
