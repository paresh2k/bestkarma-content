#!/usr/bin/env node
/**
 * agent-validator.mjs — Agent 3: GPT-4o-mini Validator
 *
 * Finds articles with status: drafted in drafts/{pillar}/, validates them
 * using GPT-4o-mini, and either:
 *   - Approves: copies to validated/articles/ + creates bundle → triggers Agent 4
 *   - Rejects: adds reviewer notes to the draft, sets status: needs-revision
 *
 * Usage:
 *   node pipelines/agent-validator.mjs           — process all drafted articles
 *   node pipelines/agent-validator.mjs <slug>    — process one specific slug
 *
 * Requires: OPENAI_API_KEY environment variable
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import { parseFrontmatter, getMarkdownFiles, ensureDir, fileExists } from './content-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(__dirname, '..');
const PILLARS = ['longevity', 'sleep', 'nutrition', 'mind-body', 'wellness'];
const targetSlug = process.argv[2] || null;

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set.');
  process.exit(1);
}

const openai = new OpenAI();

// Default hero images per category (verified working Unsplash IDs)
const DEFAULT_HERO_IMAGES = {
  longevity: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&auto=format&fit=crop&q=80',
  sleep:     'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=1200&auto=format&fit=crop&q=80',
  nutrition: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&auto=format&fit=crop&q=80',
  'mind-body': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&auto=format&fit=crop&q=80',
  wellness:  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&auto=format&fit=crop&q=80',
};

// --- Find drafted articles ---
async function findDraftedArticles() {
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
      if (frontmatter.status === 'drafted') {
        results.push({ slug, pillar, filePath, content, frontmatter });
      }
    }
  }
  return results;
}

// --- Extract article body (after frontmatter) ---
function extractBody(content) {
  const match = content.match(/^---\n[\s\S]*?\n---\n?/);
  if (!match) return content;
  return content.slice(match[0].length).trim();
}

// --- Validate image URL ---
async function validateImageUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Call GPT-4o-mini for validation ---
async function validateWithGPT(frontmatter, body) {
  const prompt = `
You are a health content editor for BestKarma, an evidence-based wellness platform. Review this article and return a JSON validation report.

## Article Metadata
- Title: ${frontmatter.title}
- Description: ${frontmatter.description}
- Category: ${frontmatter.category}
- Tags: ${Array.isArray(frontmatter.tags) ? frontmatter.tags.join(', ') : frontmatter.tags}

## Article Body
${body}

---

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "decision": "approved" or "needs-revision",
  "wordCount": <estimated word count as integer>,
  "hasSourcesCited": <true if article cites named studies/journals, false otherwise>,
  "hasMedicalDisclaimer": <true if article contains a medical disclaimer where needed>,
  "claimsSupported": <true if major claims appear backed by cited evidence>,
  "structureSound": <true if article has clear intro, evidence, mechanism, and practical sections>,
  "toneAppropriate": <true if tone is evidence-based, not hyped or overly cautious>,
  "issues": [<list of specific problems if decision is needs-revision, empty array if approved>],
  "suggestions": [<list of improvement suggestions, can be present for approved articles too>]
}

Guidelines for decision:
- "approved": word count 700+, claims supported, sources cited, structure sound, tone appropriate
- "needs-revision": word count under 700, major unsupported claims, missing structure, misleading tone
`.trim();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const result = JSON.parse(response.choices[0].message.content);
  return {
    result,
    tokens: response.usage,
  };
}

// --- Write approved article to validated/ ---
async function promoteToValidated(slug, pillar, content, frontmatter, reviewResult) {
  const today = new Date().toISOString().split('T')[0];

  // Resolve hero image
  let heroImage = frontmatter.heroImage || '';
  if (!heroImage || !(await validateImageUrl(heroImage))) {
    heroImage = DEFAULT_HERO_IMAGES[frontmatter.category] || DEFAULT_HERO_IMAGES.wellness;
    console.log(`  ℹ Using default hero image for ${frontmatter.category}`);
  }

  // Update draft frontmatter: status → validated, dates set, heroImage ensured
  let updatedContent = content
    .replace(/^status: .+$/m, 'status: validated')
    .replace(/^pubDate: .+$/m, `pubDate: ${today}`)
    .replace(/^reviewedDate: .+$/m, `reviewedDate: ${today}`)
    .replace(/^reviewer: .+$/m, 'reviewer: gpt-validator');

  if (/^heroImage:/m.test(updatedContent)) {
    updatedContent = updatedContent.replace(/^heroImage:.*$/m, `heroImage: "${heroImage}"`);
  } else {
    updatedContent = updatedContent.replace(
      /^(reviewedDate:.+)$/m,
      `$1\nheroImage: "${heroImage}"`
    );
  }

  // Write to validated/articles/
  const validatedArticlesDir = path.join(contentRoot, 'validated', 'articles');
  await ensureDir(validatedArticlesDir);
  await fs.writeFile(path.join(validatedArticlesDir, `${slug}.md`), updatedContent, 'utf8');

  // Update status in the draft file too
  await fs.writeFile(
    path.join(contentRoot, 'drafts', pillar, `${slug}.md`),
    updatedContent,
    'utf8'
  );

  // Create bundle directory
  const bundleDir = path.join(contentRoot, 'validated', `${slug}.bundle`);
  await ensureDir(bundleDir);

  // review.json
  await fs.writeFile(
    path.join(bundleDir, 'review.json'),
    JSON.stringify({
      reviewer: 'gpt-validator',
      model: 'gpt-4o-mini',
      reviewedAt: today,
      status: 'approved',
      wordCount: reviewResult.wordCount,
      hasSourcesCited: reviewResult.hasSourcesCited,
      hasMedicalDisclaimer: reviewResult.hasMedicalDisclaimer,
      suggestions: reviewResult.suggestions || [],
      notes: ['Validated by GPT-4o-mini. Pending human editorial sign-off.'],
    }, null, 2),
    'utf8'
  );

  // sources.json
  const sourceMatches = content.match(/DOI:|PubMed:|doi\.org|ncbi\.nlm/gi) || [];
  await fs.writeFile(
    path.join(bundleDir, 'sources.json'),
    JSON.stringify({
      sourceStyle: 'inline-footnotes',
      sourceCount: Math.max(sourceMatches.length, 1),
      note: 'Primary references cited inline in article body.',
    }, null, 2),
    'utf8'
  );

  // image.json
  await fs.writeFile(
    path.join(bundleDir, 'image.json'),
    JSON.stringify({
      id: slug,
      alt: frontmatter.title || slug,
      credit: heroImage.includes('unsplash') ? 'Unsplash' : 'External',
      sourceUrl: heroImage,
      usage: 'hero',
    }, null, 2),
    'utf8'
  );

  console.log(`  ✓ Promoted to validated/articles/${slug}.md`);
  console.log(`  ✓ Bundle created: validated/${slug}.bundle/`);
}

// --- Mark draft as needs-revision ---
async function markNeedsRevision(filePath, content, issues) {
  const reviewNote = `\n\n---\n<!-- VALIDATOR FEEDBACK (${new Date().toISOString().split('T')[0]})\n${issues.map(i => `- ${i}`).join('\n')}\n-->\n`;
  const updated = content
    .replace(/^status: .+$/m, 'status: needs-revision')
    + reviewNote;
  await fs.writeFile(filePath, updated, 'utf8');
  console.log(`  ✗ Marked as needs-revision`);
  issues.forEach(i => console.log(`    • ${i}`));
}

// --- Main ---
const articles = await findDraftedArticles();

if (articles.length === 0) {
  if (targetSlug) {
    console.log(`No drafted article found for slug: ${targetSlug}`);
  } else {
    console.log('No drafted articles found across any pillar.');
  }
  process.exit(0);
}

console.log(`Found ${articles.length} drafted article(s) to validate.\n`);

let totalTokens = 0;

// Delay between articles to stay under OpenAI rate limits (200k TPM for gpt-4o-mini)
const DELAY_MS = 10_000; // 10 seconds — safe for bulk validation runs

for (let i = 0; i < articles.length; i++) {
  const { slug, pillar, filePath, content, frontmatter } = articles[i];
  console.log(`→ [${i + 1}/${articles.length}] Validating: ${slug} (${pillar})`);
  const body = extractBody(content);

  try {
    const { result, tokens } = await validateWithGPT(frontmatter, body);
    totalTokens += (tokens.total_tokens || 0);

    const cost = (((tokens.prompt_tokens || 0) * 0.15 + (tokens.completion_tokens || 0) * 0.60) / 1_000_000).toFixed(5);
    console.log(`  GPT decision: ${result.decision} — ${result.wordCount} words, ~$${cost}`);

    if (result.decision === 'approved') {
      await promoteToValidated(slug, pillar, content, frontmatter, result);
    } else {
      await markNeedsRevision(filePath, content, result.issues);
    }
  } catch (err) {
    console.error(`  ✗ Validation failed for ${slug}: ${err.message}`);
  }

  // Pause between articles (skip after last one)
  if (i < articles.length - 1) {
    console.log(`  ⏳ Waiting ${DELAY_MS / 1000}s before next article (rate limit)...`);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
}

const totalCost = (totalTokens * 0.15 / 1_000_000).toFixed(5);
console.log(`\nDone. Total tokens: ${totalTokens}, ~$${totalCost}`);
