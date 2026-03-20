#!/usr/bin/env node
/**
 * add-readability-blocks.mjs — Add TL;DR, Key Takeaways, and Quick Read blocks to articles
 *
 * Uses Claude Haiku to generate plain-English summaries for each article,
 * then injects three styled HTML blocks into the markdown:
 *   1. TL;DR — top of article, 5 bullets, 30-second read
 *   2. Key Takeaways — before citations, 5 actionable bullets
 *   3. Quick Read — before citations, 150-word shareable paragraph
 *
 * Usage:
 *   node pipelines/add-readability-blocks.mjs           — process up to MAX_ARTICLES
 *   node pipelines/add-readability-blocks.mjs <slug>    — process one specific slug
 *
 * Requires: ANTHROPIC_API_KEY env var
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { parseFrontmatter, getMarkdownFiles } from './content-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(__dirname, '..');
const articlesDir = path.join(contentRoot, 'published', 'articles');
const targetSlug = process.argv[2] || null;
const MAX_ARTICLES = parseInt(process.env.MAX_ARTICLES || '15');
const DELAY_MS = 2000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
  process.exit(1);
}

const client = new Anthropic();

// Skip articles that already have the blocks
function hasReadabilityBlocks(content) {
  return content.includes('TL;DR') || content.includes('id="quick-read"');
}

// Build the TL;DR HTML block
function buildTldrBlock(bullets) {
  const items = bullets.map(b => `    <li>${b}</li>`).join('\n');
  return `<div class="not-prose rounded-2xl border border-sage-light/40 bg-mist px-6 py-5 mb-8">
  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-sage-dark mb-3">TL;DR — Read this in 30 seconds</p>
  <ul class="mt-2 space-y-2 text-sm text-stone leading-relaxed">
${items}
  </ul>
  <a href="#quick-read" class="inline-block mt-4 text-xs font-medium text-sage-dark hover:text-sage transition-colors">→ Jump to Quick Read</a>
</div>`;
}

// Build the Key Takeaways HTML block
function buildKeyTakeawaysBlock(takeaways) {
  const items = takeaways.map(t => `    <li>${t}</li>`).join('\n');
  return `<div class="not-prose rounded-2xl border border-terracotta/20 bg-terracotta/5 px-6 py-5 my-8">
  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta mb-3">Key Takeaways</p>
  <ul class="mt-2 space-y-2 text-sm text-bark leading-relaxed">
${items}
  </ul>
</div>`;
}

// Build the Quick Read HTML block
function buildQuickReadBlock(paragraph) {
  return `<div id="quick-read" class="not-prose rounded-2xl bg-bark px-6 py-5 my-8">
  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-cream mb-3">Quick Read</p>
  <p class="text-sm leading-relaxed" style="color: rgba(250,247,240,0.9)">${paragraph}</p>
</div>`;
}

// Generate blocks using Claude Haiku
async function generateBlocks(content, fm) {
  const articleText = content.replace(/^---[\s\S]*?---\n/, '').trim();

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are an editorial assistant for BestKarma, a wellness and longevity website. The site's voice is clear, direct, and science-backed — but always accessible to a general audience.

Read this article and return ONLY valid JSON (no markdown, no explanation) with three fields:

ARTICLE TITLE: ${fm.title}
ARTICLE CATEGORY: ${fm.category}
ARTICLE:
${articleText.slice(0, 4000)}

Generate:
1. "tldr": Array of exactly 5 short bullet points. Plain English, no jargon. Max 20 words each. Start each with "✓ ". Capture the most important things someone learns from this article.
2. "keyTakeaways": Array of exactly 5 actionable takeaways. Max 25 words each. Start each with "→ ". Bold the first 2-4 words using **bold**: format. Focus on what the reader can DO.
3. "quickRead": A single paragraph, 150-180 words. Plain English. Written for someone scrolling Instagram who won't read the full article. No jargon. Conversational but accurate. Shareable.

Return ONLY this JSON structure:
{"tldr":["✓ ...","✓ ...","✓ ...","✓ ...","✓ ..."],"keyTakeaways":["→ **Label:** ...","→ **Label:** ...","→ **Label:** ...","→ **Label:** ...","→ **Label:** ..."],"quickRead":"..."}`
    }]
  });

  const raw = response.content[0].text.trim();
  // Strip any markdown code fences if present
  const clean = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(clean);
}

// Inject blocks into article content
function injectBlocks(content, blocks) {
  // Extract frontmatter boundary
  const fmMatch = content.match(/^(---\n[\s\S]*?\n---\n)/);
  if (!fmMatch) return content;

  const frontmatter = fmMatch[1];
  let body = content.slice(frontmatter.length);

  // 1. Inject TL;DR at the very top of the body
  body = '\n' + buildTldrBlock(blocks.tldr) + '\n\n' + body.trimStart();

  // 2. Find injection point for Key Takeaways + Quick Read
  // Look for the final sources/disclaimer block (before citations)
  const endPatterns = [
    /\n---\n\n\*(?:Key sources|This article is for)/,
    /\n\n---\n\n\*(?:Key sources|This article is for)/,
    /\n\n\*Key sources:/,
    /\n\n\*This article is for informational/,
  ];

  let injected = false;
  for (const pattern of endPatterns) {
    const match = body.search(pattern);
    if (match !== -1) {
      const before = body.slice(0, match);
      const after = body.slice(match);
      body = before
        + '\n\n' + buildKeyTakeawaysBlock(blocks.keyTakeaways)
        + '\n\n' + buildQuickReadBlock(blocks.quickRead)
        + '\n' + after;
      injected = true;
      break;
    }
  }

  if (!injected) {
    // Fallback: append before trailing newlines
    body = body.trimEnd()
      + '\n\n' + buildKeyTakeawaysBlock(blocks.keyTakeaways)
      + '\n\n' + buildQuickReadBlock(blocks.quickRead)
      + '\n';
  }

  return frontmatter + body;
}

// --- Main ---
const allFiles = await getMarkdownFiles(articlesDir);
const toProcess = [];

for (const filePath of allFiles) {
  const slug = path.basename(filePath, '.md');
  if (targetSlug && slug !== targetSlug) continue;
  const content = await fs.readFile(filePath, 'utf8');
  if (hasReadabilityBlocks(content)) continue;
  let fm;
  try { fm = parseFrontmatter(content); } catch { continue; }
  toProcess.push({ slug, filePath, content, fm });
  if (!targetSlug && toProcess.length >= MAX_ARTICLES) break;
}

if (toProcess.length === 0) {
  console.log(targetSlug
    ? `No unprocessed article found for slug: ${targetSlug}`
    : 'All articles already have readability blocks.');
  process.exit(0);
}

console.log(`Found ${toProcess.length} article(s) to process.\n`);

let succeeded = 0;
for (let i = 0; i < toProcess.length; i++) {
  const { slug, filePath, content, fm } = toProcess[i];
  console.log(`→ [${i + 1}/${toProcess.length}] ${slug}`);

  try {
    const blocks = await generateBlocks(content, fm);
    const updated = injectBlocks(content, blocks);
    await fs.writeFile(filePath, updated, 'utf8');
    succeeded++;
    console.log(`  ✓ Done`);
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message?.slice(0, 120)}`);
  }

  if (i < toProcess.length - 1) {
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
}

console.log(`\nDone. ${succeeded}/${toProcess.length} articles updated.`);
