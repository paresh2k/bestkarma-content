#!/usr/bin/env node
/**
 * agent-editor.mjs — Agent 2: Claude Editor
 *
 * Reviews human edits to a drafted article using Claude Haiku.
 * Checks brand voice, structure, claim support, and readability.
 * Refines the article in place and commits the improved version.
 * Status stays as 'drafted' so Agent 3 (Validator) picks it up next.
 *
 * Usage:
 *   node pipelines/agent-editor.mjs <slug> <diff>
 *
 * The diff argument is the raw git diff for the file (piped from the workflow).
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

const [slug, diffFile] = process.argv.slice(2);

if (!slug) {
  console.error('Usage: node pipelines/agent-editor.mjs <slug> [diff-file]');
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
  process.exit(1);
}

const client = new Anthropic();

// Load content guidelines
const guidelinesPath = path.join(contentRoot, 'prompts', 'content-guidelines.md');
const guidelines = await fs.readFile(guidelinesPath, 'utf8');

// --- Find the draft file ---
async function findDraft(slug) {
  for (const pillar of PILLARS) {
    const filePath = path.join(contentRoot, 'drafts', pillar, `${slug}.md`);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const frontmatter = parseFrontmatter(content);
      if (frontmatter.status === 'drafted') {
        return { filePath, content, frontmatter, pillar };
      }
    } catch {
      continue;
    }
  }
  return null;
}

// --- Extract body after frontmatter ---
function extractBody(content) {
  const match = content.match(/^---\n[\s\S]*?\n---\n?/);
  if (!match) return content;
  return content.slice(match[0].length).trim();
}

// --- Replace body while preserving frontmatter ---
function replaceBody(content, newBody) {
  const match = content.match(/^---\n[\s\S]*?\n---\n?/);
  if (!match) return newBody;
  return match[0] + '\n' + newBody + '\n';
}

// --- Call Claude Haiku for editorial review ---
async function reviewWithClaude(frontmatter, currentBody, diff) {
  const diffSection = diff
    ? `## Human Edits (git diff)\n\`\`\`diff\n${diff}\n\`\`\``
    : '## Human Edits\nNo diff available — review the full article body for quality.';

  const prompt = `
You are the BestKarma editorial AI. A human editor has made changes to the following article draft. Review their edits and the full article, then return an improved version.

## Article Metadata
- Title: ${frontmatter.title}
- Category: ${frontmatter.category}
- Description: ${frontmatter.description}

${diffSection}

## Current Full Article Body
${currentBody}

---

Your editorial task:
1. Review the human edits for quality and intent — respect what they were trying to do
2. Check the full article against BestKarma brand voice (intelligent, warm, evidence-based)
3. Fix any awkward phrasing, inconsistencies, or structural issues introduced by the edits
4. Ensure all major claims are backed by cited sources in the text
5. Check that a medical disclaimer is present if the topic requires one
6. Do NOT change the core meaning or add new claims the human didn't intend

Return ONLY the improved article body. No frontmatter, no YAML, no explanations.
Start directly with the opening paragraph.
`.trim();

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
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

// --- Main ---
console.log(`\n→ Editing: ${slug}`);

const draft = await findDraft(slug);
if (!draft) {
  console.log(`  No drafted article found for slug: ${slug} — skipping.`);
  process.exit(0);
}

const { filePath, content, frontmatter } = draft;
const currentBody = extractBody(content);

// Read diff from file if provided
let diff = '';
if (diffFile) {
  try {
    diff = await fs.readFile(diffFile, 'utf8');
  } catch {
    console.log('  No diff file found — reviewing full article.');
  }
}

try {
  const { body, inputTokens, outputTokens } = await reviewWithClaude(frontmatter, currentBody, diff);

  // Write improved article back, status stays drafted
  const improved = replaceBody(content, body);
  await fs.writeFile(filePath, improved, 'utf8');

  const cost = ((inputTokens * 0.8 + outputTokens * 4) / 1_000_000).toFixed(5);
  console.log(`  ✓ Reviewed — ${outputTokens} tokens out, ~$${cost}`);
  console.log(`  Draft updated: ${path.relative(contentRoot, filePath)}`);
} catch (err) {
  console.error(`  ✗ Editor failed for ${slug}: ${err.message}`);
  process.exit(1);
}
