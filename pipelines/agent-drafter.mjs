#!/usr/bin/env node
/**
 * agent-drafter.mjs — Agent 1: Claude Drafter (research + write in one call)
 *
 * Finds articles with status: briefed in drafts/{pillar}/, then:
 *   1. Fetches a relevant Unsplash image for the hero
 *   2. Calls Claude once with web_search tool — it researches and writes in one pass
 *   3. Saves the draft with heroImage set and status: drafted
 *
 * Usage:
 *   node pipelines/agent-drafter.mjs           — process all briefed articles
 *   node pipelines/agent-drafter.mjs <slug>    — process one specific slug
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 * Optional: UNSPLASH_ACCESS_KEY environment variable (falls back to category defaults)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { parseFrontmatter, getMarkdownFiles } from './content-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(__dirname, '..');
const PILLARS = ['longevity', 'sleep', 'nutrition', 'mind-body', 'wellness'];
const targetSlug = process.argv[2] || null;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
  process.exit(1);
}

const client = new Anthropic();

// Load content guidelines (system prompt)
const guidelinesPath = path.join(contentRoot, 'prompts', 'content-guidelines.md');
const guidelines = await fs.readFile(guidelinesPath, 'utf8');

// Default hero images per category (verified Unsplash IDs as fallback)
const DEFAULT_HERO_IMAGES = {
  longevity:   'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&auto=format&fit=crop&q=80',
  sleep:       'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=1200&auto=format&fit=crop&q=80',
  nutrition:   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&auto=format&fit=crop&q=80',
  'mind-body': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&auto=format&fit=crop&q=80',
  wellness:    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&auto=format&fit=crop&q=80',
};

// --- Find briefed articles ---
async function findBriefedArticles() {
  const results = [];
  for (const pillar of PILLARS) {
    const dir = path.join(contentRoot, 'drafts', pillar);
    const files = await getMarkdownFiles(dir);
    for (const filePath of files) {
      const slug = path.basename(filePath, '.md');
      if (targetSlug && slug !== targetSlug) continue;
      const content = await fs.readFile(filePath, 'utf8');
      let frontmatter;
      try { frontmatter = parseFrontmatter(content); } catch { continue; }
      if (frontmatter.status === 'briefed') {
        results.push({ slug, pillar, filePath, content, frontmatter });
      }
    }
  }
  return results;
}

// --- Extract body (brief content) after frontmatter ---
function extractBody(content) {
  const match = content.match(/^---\n[\s\S]*?\n---\n?/);
  if (!match) return '';
  return content.slice(match[0].length).trim();
}

// --- Fetch relevant Unsplash image ---
async function fetchUnsplashImage(frontmatter) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return DEFAULT_HERO_IMAGES[frontmatter.category] || DEFAULT_HERO_IMAGES.wellness;
  }

  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.slice(0, 3) : [];
  const query = [...tags, frontmatter.category, 'health'].join(' ');

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&content_filter=high`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${accessKey}` } });
    if (!res.ok) throw new Error(`Unsplash API ${res.status}`);
    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) {
      return DEFAULT_HERO_IMAGES[frontmatter.category] || DEFAULT_HERO_IMAGES.wellness;
    }
    const pick = results[Math.floor(Math.random() * results.length)];
    console.log(`  🖼 Image: Unsplash / ${pick.user.name}`);
    return `${pick.urls.raw}&w=1200&auto=format&fit=crop&q=80`;
  } catch {
    return DEFAULT_HERO_IMAGES[frontmatter.category] || DEFAULT_HERO_IMAGES.wellness;
  }
}

// --- Single Claude call: research + write using web_search tool ---
async function researchAndWrite(frontmatter, brief) {
  const prompt = `
Here is the article brief:

**Title:** ${frontmatter.title}
**Description:** ${frontmatter.description}
**Pillar:** ${frontmatter.category}
**Tags:** ${Array.isArray(frontmatter.tags) ? frontmatter.tags.join(', ') : frontmatter.tags}
**Target read time:** ${frontmatter.readTime} minutes (~${(frontmatter.readTime || 8) * 180} words)

## Editorial Brief
${brief || 'Write a comprehensive, evidence-based article based on the title and description.'}

---

Instructions:
1. Use web_search to find 2-3 key recent studies or expert sources on this topic (2020-2026).
2. Write the full article body following the BestKarma content guidelines.
3. Cite the studies, authors, journals, and years you found throughout the article.
4. Return ONLY the article body — no frontmatter, no YAML, no title heading. Start with the opening paragraph.
`.trim();

  const messages = [{ role: 'user', content: prompt }];
  let inputTokens = 0;
  let outputTokens = 0;

  // Agentic loop — continue until Claude finishes (no more tool calls)
  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: guidelines,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages,
    });

    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const body = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n\n')
        .trim();
      return { body, inputTokens, outputTokens };
    }

    if (response.stop_reason === 'tool_use') {
      console.log(`  🔍 Searching web...`);
      const toolResults = response.content
        .filter(b => b.type === 'tool_use')
        .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: '' }));
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    throw new Error(`Unexpected stop_reason: ${response.stop_reason}`);
  }
}

// --- Write the drafted article back to the file ---
async function writeDraft(filePath, content, articleBody, heroImage) {
  let updated = content.replace(/^status: .+$/m, 'status: drafted');

  if (/^heroImage:/m.test(updated)) {
    updated = updated.replace(/^heroImage:.*$/m, `heroImage: "${heroImage}"`);
  } else {
    updated = updated.replace(/^(category:.+)$/m, `$1\nheroImage: "${heroImage}"`);
  }

  const fmEnd = updated.indexOf('---', 3) + 3;
  const newContent = updated.slice(0, fmEnd) + '\n\n' + articleBody + '\n';
  await fs.writeFile(filePath, newContent, 'utf8');
}

// --- Main ---
const articles = await findBriefedArticles();

if (articles.length === 0) {
  if (targetSlug) {
    console.log(`No briefed article found for slug: ${targetSlug}`);
  } else {
    console.log('No briefed articles found across any pillar.');
  }
  process.exit(0);
}

console.log(`Found ${articles.length} briefed article(s) to draft.\n`);

// 65 seconds between articles — one Claude call per article now,
// but web_search rounds add tokens. 65s safely stays under 30k TPM.
const DELAY_MS = 65_000;

let totalInput = 0;
let totalOutput = 0;

for (let i = 0; i < articles.length; i++) {
  const { slug, pillar, filePath, content, frontmatter } = articles[i];
  console.log(`→ [${i + 1}/${articles.length}] Drafting: ${slug} (${pillar})`);
  const brief = extractBody(content);

  try {
    const heroImage = await fetchUnsplashImage(frontmatter);
    console.log(`  ✍ Researching and writing...`);
    const { body, inputTokens, outputTokens } = await researchAndWrite(frontmatter, brief);

    await writeDraft(filePath, content, body, heroImage);

    totalInput += inputTokens;
    totalOutput += outputTokens;
    const cost = ((inputTokens * 3 + outputTokens * 15) / 1_000_000).toFixed(4);
    console.log(`  ✓ Done — ${outputTokens} tokens out, ~$${cost}`);
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message?.slice(0, 120)}`);
  }

  if (i < articles.length - 1) {
    console.log(`  ⏳ Waiting ${DELAY_MS / 1000}s (rate limit)...`);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
}

const totalCost = ((totalInput * 3 + totalOutput * 15) / 1_000_000).toFixed(4);
console.log(`\nDone. Total: ${totalInput} in / ${totalOutput} out — ~$${totalCost}`);
