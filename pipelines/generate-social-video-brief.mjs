#!/usr/bin/env node
/**
 * generate-social-video-brief.mjs
 *
 * Creates a draft short-form video package for validated or published articles.
 *
 * Outputs:
 * - validated/<slug>.bundle/video.json
 * - social/shorts/<slug>/master-script.txt
 * - social/shorts/<slug>/*caption.txt
 *
 * Usage:
 *   node pipelines/generate-social-video-brief.mjs
 *   node pipelines/generate-social-video-brief.mjs <slug>
 *
 * Requires: OPENAI_API_KEY
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import { ensureDir, fileExists, getMarkdownFiles, parseFrontmatter, readJson, slugFromPath } from './content-utils.mjs';
import { publishedDir, validatedDir } from './content-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(__dirname, '..');
const targetSlug = process.argv[2] || null;
const SOCIAL_ROOT = path.join(contentRoot, 'social', 'shorts');

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set.');
  process.exit(1);
}

const openai = new OpenAI();
const MODEL = process.env.SOCIAL_VIDEO_MODEL || 'gpt-4o-mini';
const MAX_ARTICLES = parseInt(process.env.MAX_ARTICLES || '10', 10);

function extractBody(content) {
  const match = content.match(/^---\n[\s\S]*?\n---\n?/);
  if (!match) return content.trim();
  return content.slice(match[0].length).trim();
}

async function loadPromptGuidelines() {
  const filePath = path.join(contentRoot, 'prompts', 'social-video-guidelines.md');
  return fs.readFile(filePath, 'utf8');
}

async function findEligibleArticles() {
  const buckets = [
    { name: 'validated', dir: validatedDir },
    { name: 'published', dir: publishedDir },
  ];
  const results = [];
  const seen = new Set();

  for (const bucket of buckets) {
    const files = await getMarkdownFiles(bucket.dir);
    for (const filePath of files) {
      const slug = slugFromPath(filePath);
      if (seen.has(slug)) continue;
      if (targetSlug && slug !== targetSlug) continue;

      const bundleDir = path.join(bucket.dir, '..', `${slug}.bundle`);
      const videoJsonPath = path.join(bundleDir, 'video.json');
      if (await fileExists(videoJsonPath)) continue;

      const content = await fs.readFile(filePath, 'utf8');
      let frontmatter;
      try {
        frontmatter = parseFrontmatter(content);
      } catch {
        continue;
      }

      results.push({
        slug,
        bucket: bucket.name,
        articlePath: filePath,
        bundleDir,
        content,
        frontmatter,
      });
      seen.add(slug);
    }
  }

  return targetSlug ? results : results.slice(0, MAX_ARTICLES);
}

function buildSourceSummary(sourcesJson) {
  if (!sourcesJson) return 'Inline sources are cited in the article body.';
  if (Array.isArray(sourcesJson.sources) && sourcesJson.sources.length > 0) {
    return sourcesJson.sources
      .slice(0, 5)
      .map((source) => `${source.title} (${source.type || 'source'}, evidence: ${source.evidenceLevel || 'unknown'})`)
      .join('; ');
  }
  if (sourcesJson.note) return sourcesJson.note;
  return 'Inline sources are cited in the article body.';
}

async function generateVideoPackage({ slug, frontmatter, content, bundleDir }) {
  const body = extractBody(content);
  const reviewPath = path.join(bundleDir, 'review.json');
  const sourcesPath = path.join(bundleDir, 'sources.json');
  const reviewJson = await (await fileExists(reviewPath) ? readJson(reviewPath) : Promise.resolve(null));
  const sourcesJson = await (await fileExists(sourcesPath) ? readJson(sourcesPath) : Promise.resolve(null));
  const guidelines = await loadPromptGuidelines();

  const prompt = `
${guidelines}

You are creating a short-form video package for an approved BestKarma health article.

Return ONLY valid JSON matching this exact structure:
{
  "status": "needs-review",
  "sourceArticleSlug": "${slug}",
  "approvedArticleStatus": "${frontmatter.status}",
  "angle": "counterintuitive-truth",
  "hook": "One sentence hook",
  "durationSeconds": 30,
  "script": {
    "hook": "Short opening line",
    "beats": [
      "Beat 1",
      "Beat 2",
      "Beat 3"
    ],
    "close": "Follow BestKarma for science-backed health without the hype."
  },
  "visualPlan": [
    "Visual 1",
    "Visual 2",
    "Visual 3",
    "Visual 4"
  ],
  "captions": {
    "instagram": "Instagram caption",
    "facebook": "Facebook caption",
    "tiktok": "TikTok caption",
    "youtube": "YouTube Shorts caption"
  },
  "titles": {
    "instagram": "Instagram cover title",
    "facebook": "Facebook title",
    "tiktok": "TikTok title",
    "youtube": "YouTube Shorts title"
  },
  "hashtags": ["health", "longevity", "sciencebacked"],
  "complianceNotes": [
    "Do not imply diagnosis or treatment.",
    "Retain at least one meaningful caveat from the article."
  ],
  "review": {
    "reviewedBy": null,
    "reviewedAt": null,
    "status": "pending"
  },
  "renderAssets": {
    "videoPath": null,
    "coverImagePath": null,
    "subtitlePath": null
  },
  "posting": {
    "instagram": {
      "status": "not-scheduled",
      "scheduledFor": null,
      "publishedUrl": null
    },
    "facebook": {
      "status": "not-scheduled",
      "scheduledFor": null,
      "publishedUrl": null
    },
    "tiktok": {
      "status": "not-scheduled",
      "scheduledFor": null,
      "publishedUrl": null
    },
    "youtube": {
      "status": "not-scheduled",
      "scheduledFor": null,
      "publishedUrl": null
    }
  }
}

Requirements:
- Keep the video accurate to the article.
- Do not overstate certainty.
- Preserve one real caveat from the article in either the beats, caption, or compliance notes.
- Make the hook strong enough for short-form social but not clickbait.
- Make captions platform-specific.
- Keep the tone warm, direct, and science-backed.

Article metadata:
- Title: ${frontmatter.title}
- Description: ${frontmatter.description}
- Category: ${frontmatter.category}
- Tags: ${Array.isArray(frontmatter.tags) ? frontmatter.tags.join(', ') : ''}
- Read time: ${frontmatter.readTime || 'unknown'}
- Review notes: ${reviewJson?.notes?.join(' | ') || 'No review notes provided.'}
- Source summary: ${buildSourceSummary(sourcesJson)}

Article body:
${body}
`.trim();

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  });

  return {
    json: JSON.parse(response.choices[0].message.content),
    usage: response.usage,
  };
}

async function writePackage(slug, bundleDir, videoPackage) {
  await ensureDir(bundleDir);
  const videoJsonPath = path.join(bundleDir, 'video.json');
  await fs.writeFile(videoJsonPath, JSON.stringify(videoPackage, null, 2), 'utf8');

  const shortDir = path.join(SOCIAL_ROOT, slug);
  await ensureDir(shortDir);

  const scriptLines = [
    `Hook: ${videoPackage.script?.hook || ''}`,
    '',
    'Beats:',
    ...((videoPackage.script?.beats || []).map((beat, idx) => `${idx + 1}. ${beat}`)),
    '',
    `Close: ${videoPackage.script?.close || ''}`,
  ];
  await fs.writeFile(path.join(shortDir, 'master-script.txt'), `${scriptLines.join('\n')}\n`, 'utf8');

  for (const platform of ['instagram', 'facebook', 'tiktok', 'youtube']) {
    const title = videoPackage.titles?.[platform] || '';
    const caption = videoPackage.captions?.[platform] || '';
    const hashtags = Array.isArray(videoPackage.hashtags) ? videoPackage.hashtags.map((tag) => `#${tag}`).join(' ') : '';
    const payload = [`Title: ${title}`, '', caption, '', hashtags].join('\n');
    await fs.writeFile(path.join(shortDir, `${platform}-caption.txt`), `${payload}\n`, 'utf8');
  }
}

const articles = await findEligibleArticles();
if (articles.length === 0) {
  console.log(targetSlug ? `No eligible article found for slug: ${targetSlug}` : 'No validated or published articles need a video package.');
  process.exit(0);
}

console.log(`Generating social video packages for ${articles.length} article(s)...\n`);
let totalTokens = 0;

for (let i = 0; i < articles.length; i++) {
  const article = articles[i];
  console.log(`→ [${i + 1}/${articles.length}] ${article.slug} (${article.bucket})`);

  try {
    const { json, usage } = await generateVideoPackage(article);
    totalTokens += usage?.total_tokens || 0;
    await writePackage(article.slug, article.bundleDir, json);
    console.log(`  ✓ Wrote ${article.bucket}/${article.slug}.bundle/video.json`);
    console.log(`  ✓ Wrote social/shorts/${article.slug}/ assets`);
  } catch (error) {
    console.error(`  ✗ Failed for ${article.slug}: ${error.message}`);
  }
}

console.log(`\nDone. Total tokens: ${totalTokens}`);
