#!/usr/bin/env node
/**
 * publish-social-assets.mjs
 *
 * Metadata-first scheduler/publisher skeleton for short-form social assets.
 *
 * Usage:
 *   node pipelines/publish-social-assets.mjs <slug> [--platform instagram|facebook|tiktok|youtube|all] [--action export|schedule|publish] [--at ISO_DATE] [--url URL]
 *
 * Examples:
 *   node pipelines/publish-social-assets.mjs alcohol-rem-sleep-suppression
 *   node pipelines/publish-social-assets.mjs alcohol-rem-sleep-suppression --platform instagram --action schedule --at 2026-03-31T14:00:00Z
 *   node pipelines/publish-social-assets.mjs alcohol-rem-sleep-suppression --platform youtube --action publish --url https://youtube.com/shorts/example
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, fileExists, readJson } from './content-utils.mjs';
import { publishedDir, validatedDir } from './content-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(__dirname, '..');
const SOCIAL_ROOT = path.join(contentRoot, 'social', 'shorts');
const SUPPORTED_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'youtube'];

function parseArgs(argv) {
  const [slug, ...rest] = argv;
  const options = {
    slug,
    platform: 'all',
    action: 'export',
    at: null,
    url: null,
  };

  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    const next = rest[i + 1];

    if (token === '--platform' && next) {
      options.platform = next;
      i++;
    } else if (token === '--action' && next) {
      options.action = next;
      i++;
    } else if (token === '--at' && next) {
      options.at = next;
      i++;
    } else if (token === '--url' && next) {
      options.url = next;
      i++;
    }
  }

  return options;
}

const args = parseArgs(process.argv.slice(2));

if (!args.slug) {
  console.error('Usage: node pipelines/publish-social-assets.mjs <slug> [--platform ...] [--action ...] [--at ISO_DATE] [--url URL]');
  process.exit(1);
}

if (!['export', 'schedule', 'publish'].includes(args.action)) {
  console.error(`Invalid action "${args.action}". Use export, schedule, or publish.`);
  process.exit(1);
}

if (args.platform !== 'all' && !SUPPORTED_PLATFORMS.includes(args.platform)) {
  console.error(`Invalid platform "${args.platform}". Use one of: ${SUPPORTED_PLATFORMS.join(', ')}, all.`);
  process.exit(1);
}

if (args.action === 'schedule' && !args.at) {
  console.error('The schedule action requires --at <ISO_DATE>.');
  process.exit(1);
}

if (args.action === 'publish' && !args.url) {
  console.error('The publish action requires --url <PUBLISHED_URL>.');
  process.exit(1);
}

async function findVideoJsonPath(slug) {
  for (const baseDir of [publishedDir, validatedDir]) {
    const candidate = path.join(baseDir, '..', `${slug}.bundle`, 'video.json');
    if (await fileExists(candidate)) return candidate;
  }
  return null;
}

function selectedPlatforms(platformArg) {
  return platformArg === 'all' ? SUPPORTED_PLATFORMS : [platformArg];
}

function joinHashtags(tags) {
  return Array.isArray(tags) ? tags.map((tag) => `#${tag}`).join(' ') : '';
}

function inferOverallStatus(posting) {
  const entries = Object.values(posting || {});
  if (entries.some((entry) => entry?.status === 'published')) return 'published';
  if (entries.some((entry) => entry?.status === 'scheduled')) return 'scheduled';
  return 'rendered';
}

function buildPayload(videoJson, platform) {
  const hashtags = joinHashtags(videoJson.hashtags);
  return {
    platform,
    sourceArticleSlug: videoJson.sourceArticleSlug,
    title: videoJson.titles?.[platform] || '',
    caption: videoJson.captions?.[platform] || '',
    hashtags,
    videoPath: videoJson.renderAssets?.videoPath || null,
    coverImagePath: videoJson.renderAssets?.coverImagePath || null,
    subtitlePath: videoJson.renderAssets?.subtitlePath || null,
    complianceNotes: videoJson.complianceNotes || [],
  };
}

const videoJsonPath = await findVideoJsonPath(args.slug);
if (!videoJsonPath) {
  console.error(`No video.json found for slug: ${args.slug}`);
  process.exit(1);
}

const videoJson = await readJson(videoJsonPath);
if (videoJson.status !== 'rendered' && videoJson.status !== 'scheduled' && videoJson.status !== 'published') {
  console.error(`Video package for ${args.slug} must be rendered before export/schedule/publish. Current status: ${videoJson.status}`);
  process.exit(1);
}

if (!videoJson.renderAssets?.videoPath) {
  console.error(`Video package for ${args.slug} is missing renderAssets.videoPath.`);
  process.exit(1);
}

const platforms = selectedPlatforms(args.platform);
const publishDir = path.join(SOCIAL_ROOT, args.slug, 'publish');
await ensureDir(publishDir);

for (const platform of platforms) {
  const payload = buildPayload(videoJson, platform);
  const payloadPath = path.join(publishDir, `${platform}-payload.json`);
  await fs.writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  videoJson.posting[platform] = videoJson.posting[platform] || {
    status: 'not-scheduled',
    scheduledFor: null,
    publishedUrl: null,
  };

  if (args.action === 'schedule') {
    videoJson.posting[platform].status = 'scheduled';
    videoJson.posting[platform].scheduledFor = args.at;
  } else if (args.action === 'publish') {
    videoJson.posting[platform].status = 'published';
    videoJson.posting[platform].publishedUrl = args.url;
    videoJson.posting[platform].scheduledFor = videoJson.posting[platform].scheduledFor || new Date().toISOString();
  }
}

videoJson.status = inferOverallStatus(videoJson.posting);
await fs.writeFile(videoJsonPath, `${JSON.stringify(videoJson, null, 2)}\n`, 'utf8');

console.log(`Updated ${path.relative(contentRoot, videoJsonPath)} using action "${args.action}" for ${platforms.join(', ')}.`);
console.log(`Payloads written to social/shorts/${args.slug}/publish/`);
