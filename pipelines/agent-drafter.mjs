#!/usr/bin/env node
/**
 * agent-drafter.mjs — Agent 1: Claude Drafter
 *
 * Finds articles with status: briefed in drafts/{pillar}/, calls the Claude API
 * to write a full article from the brief, and updates status to drafted.
 *
 * Usage:
 *   node pipelines/agent-drafter.mjs           — process all briefed articles
 *   node pipelines/agent-drafter.mjs <slug>    — process one specific slug
 *
 * Requires: ANTHROPIC_API_KEY environment variable
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

// --- Find briefed articles across all pillars ---
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
      try {
        frontmatter = parseFrontmatter(content);
      } catch {
        continue;
      }
      if (frontmatter.status === 'briefed') {
        results.push({ slug, pillar, filePath, content, frontmatter });
      }
    }
  }
  return results;
}

// --- Extract the body (brief content) after frontmatter ---
function extractBody(content) {
  const match = content.match(/^---\n[\s\S]*?\n---\n?/);
  if (!match) return '';
  return content.slice(match[0].length).trim();
}

// --- Call Claude API to draft the article ---
async function callClaude(frontmatter, brief) {
  const prompt = `
Here is the article brief:

**Title:** ${frontmatter.title}
**Description:** ${frontmatter.description}
**Pillar:** ${frontmatter.category}
**Tags:** ${Array.isArray(frontmatter.tags) ? frontmatter.tags.join(', ') : frontmatter.tags}
**Target read time:** ${frontmatter.readTime} minutes (~${(frontmatter.readTime || 8) * 180} words)

## Brief Content
${brief || 'No additional brief provided — write a comprehensive article based on the title and description.'}

---

Write the full article body following the BestKarma content guidelines. Return ONLY the article body — no frontmatter, no YAML, no title heading. Start directly with the opening paragraph.
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
async function writeDraft(filePath, content, articleBody) {
  // Update status in frontmatter
  const updated = content
    .replace(/^status: .+$/m, 'status: drafted');

  // Replace everything after the closing --- with the new article body
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
    const { body, inputTokens, outputTokens } = await callClaude(frontmatter, brief);
    await writeDraft(filePath, content, body);

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
