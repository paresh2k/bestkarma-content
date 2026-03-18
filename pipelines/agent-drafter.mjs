#!/usr/bin/env node
/**
 * agent-drafter.mjs — Agent 1: Claude Drafter (with web research + image sourcing)
 *
 * Finds articles with status: briefed in drafts/{pillar}/, then:
 *   1. Searches the web for recent studies and evidence on the topic
 *   2. Fetches a relevant Unsplash image for the hero
 *   3. Calls Claude to write a full, research-grounded article
 *   4. Saves the draft with heroImage set and status: drafted
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

// --- Step 1: Web research using Claude's web_search tool ---
async function researchTopic(frontmatter, brief) {
  console.log(`  🔍 Researching: ${frontmatter.title}`);

  const researchPrompt = `You are a health science researcher. Research the following wellness/longevity topic and gather:
1. Key scientific studies (with authors, journal, year, and main finding)
2. Current clinical guidelines or expert consensus
3. Recent developments or debates in the field (2023-2026)
4. Any important caveats or limitations in the evidence

Topic: ${frontmatter.title}
Category: ${frontmatter.category}
Brief: ${brief || frontmatter.description}

Search for recent, high-quality evidence. Focus on peer-reviewed studies, systematic reviews, and meta-analyses. Return a structured research summary that will be used to write an evidence-based article.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: researchPrompt }],
    });

    // Extract text from all content blocks (including after tool use)
    const researchSummary = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n\n')
      .trim();

    return researchSummary || 'No additional research findings.';
  } catch (err) {
    console.log(`  ⚠ Web research unavailable (${err.message?.slice(0, 50)}), proceeding without it.`);
    return null;
  }
}

// --- Step 2: Fetch relevant Unsplash image ---
async function fetchUnsplashImage(frontmatter) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return DEFAULT_HERO_IMAGES[frontmatter.category] || DEFAULT_HERO_IMAGES.wellness;
  }

  // Build a focused search query from the title and category
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.slice(0, 3) : [];
  const query = [...tags, frontmatter.category, 'health'].join(' ');

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&content_filter=high`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) throw new Error(`Unsplash API ${res.status}`);

    const data = await res.json();
    const results = data.results || [];

    if (results.length === 0) {
      console.log(`  ⚠ No Unsplash results for "${query}", using category default.`);
      return DEFAULT_HERO_IMAGES[frontmatter.category] || DEFAULT_HERO_IMAGES.wellness;
    }

    // Pick a random result from top 5 for variety
    const pick = results[Math.floor(Math.random() * results.length)];
    const imageUrl = `${pick.urls.raw}&w=1200&auto=format&fit=crop&q=80`;

    console.log(`  🖼 Image sourced from Unsplash (${pick.user.name})`);
    return imageUrl;
  } catch (err) {
    console.log(`  ⚠ Unsplash fetch failed (${err.message?.slice(0, 50)}), using category default.`);
    return DEFAULT_HERO_IMAGES[frontmatter.category] || DEFAULT_HERO_IMAGES.wellness;
  }
}

// --- Step 3: Call Claude to write the article ---
async function callClaude(frontmatter, brief, researchSummary) {
  const researchSection = researchSummary
    ? `## Research Findings\n\n${researchSummary}\n\n---\n\n`
    : '';

  const prompt = `
Here is the article brief:

**Title:** ${frontmatter.title}
**Description:** ${frontmatter.description}
**Pillar:** ${frontmatter.category}
**Tags:** ${Array.isArray(frontmatter.tags) ? frontmatter.tags.join(', ') : frontmatter.tags}
**Target read time:** ${frontmatter.readTime} minutes (~${(frontmatter.readTime || 8) * 180} words)

## Editorial Brief
${brief || 'No additional brief provided — write a comprehensive article based on the title and description.'}

${researchSection}---

Write the full article body following the BestKarma content guidelines. Use the research findings above to cite specific studies, authors, journals, and years throughout the article. Every major claim should reference a named source. Return ONLY the article body — no frontmatter, no YAML, no title heading. Start directly with the opening paragraph.
`.trim();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: guidelines,
    messages: [{ role: 'user', content: prompt }],
  });

  return {
    body: response.content[0].text.trim(),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// --- Write the drafted article back to the file ---
async function writeDraft(filePath, content, articleBody, heroImage) {
  // Update status in frontmatter
  let updated = content.replace(/^status: .+$/m, 'status: drafted');

  // Set heroImage in frontmatter
  if (/^heroImage:/m.test(updated)) {
    updated = updated.replace(/^heroImage:.*$/m, `heroImage: "${heroImage}"`);
  } else {
    updated = updated.replace(/^(category:.+)$/m, `$1\nheroImage: "${heroImage}"`);
  }

  // Replace body after closing ---
  const fmEnd = updated.indexOf('---', 3) + 3;
  const newContent = updated.slice(0, fmEnd) + '\n\n' + articleBody + '\n';

  await fs.writeFile(filePath, newContent, 'utf8');
}

// --- Main ---
const articles = await findBriefedArticles();

if (articles.length === 0) {
  if (targetSlug) {
    console.log(`No briefed article found for slug: ${targetSlug}`);
    console.log('Make sure the file exists in drafts/{pillar}/ with status: briefed');
  } else {
    console.log('No briefed articles found across any pillar.');
  }
  process.exit(0);
}

console.log(`Found ${articles.length} briefed article(s) to draft.\n`);

let totalInput = 0;
let totalOutput = 0;

for (const { slug, pillar, filePath, content, frontmatter } of articles) {
  console.log(`→ Drafting: ${slug} (${pillar})`);
  const brief = extractBody(content);

  try {
    // Step 1: Research
    const researchSummary = await researchTopic(frontmatter, brief);

    // Step 2: Image
    const heroImage = await fetchUnsplashImage(frontmatter);

    // Step 3: Draft
    console.log(`  ✍ Writing article...`);
    const { body, inputTokens, outputTokens } = await callClaude(frontmatter, brief, researchSummary);

    await writeDraft(filePath, content, body, heroImage);

    totalInput += inputTokens;
    totalOutput += outputTokens;

    const cost = ((inputTokens * 3 + outputTokens * 15) / 1_000_000).toFixed(4);
    console.log(`  ✓ Drafted — ${outputTokens} tokens out, ~$${cost}`);
  } catch (err) {
    console.error(`  ✗ Failed to draft ${slug}: ${err.message}`);
  }
}

const totalCost = ((totalInput * 3 + totalOutput * 15) / 1_000_000).toFixed(4);
console.log(`\nDone. Total: ${totalInput} in / ${totalOutput} out — ~$${totalCost}`);
