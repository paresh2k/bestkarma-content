#!/usr/bin/env node
/**
 * regenerate-images.mjs — Replace default fallback Unsplash images with DALL-E 3 generated images
 *
 * Finds all articles using one of the 5 default Unsplash fallback images,
 * generates a custom DALL-E 3 image per article, uploads to Cloudflare R2,
 * and updates heroImage in drafts/, validated/articles/, and published/articles/.
 *
 * Usage:
 *   node pipelines/regenerate-images.mjs           — process all articles with default images
 *   node pipelines/regenerate-images.mjs <slug>    — process one specific slug
 *
 * Requires: OPENAI_API_KEY, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY env vars
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { parseFrontmatter, getMarkdownFiles } from './content-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(__dirname, '..');
const PILLARS = ['longevity', 'sleep', 'nutrition', 'mind-body', 'wellness'];
const targetSlug = process.argv[2] || null;

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set.');
  process.exit(1);
}
if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  console.error('Error: R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set.');
  process.exit(1);
}

const openai = new OpenAI();

const R2_ACCOUNT_ID = '0b70467f061e9db9bc5577188f988803';
const R2_BUCKET = 'bestkarma-images';
const R2_PUBLIC_URL = 'https://pub-e857488a53374c54a7d80bfdd7e3c219.r2.dev';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// The 5 default fallback images to replace
const DEFAULT_IMAGES = new Set([
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&auto=format&fit=crop&q=80',
]);

// Find all draft files using a default image
async function findArticlesWithDefaultImages() {
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
      const heroImage = frontmatter.heroImage || '';
      if (DEFAULT_IMAGES.has(heroImage)) {
        results.push({ slug, pillar, filePath, frontmatter });
      }
    }
  }
  return results;
}

// Sanitize text for DALL-E prompt — remove words that trigger safety filters
function sanitizePrompt(text) {
  const blocked = /psychedelic|psilocybin|mdma|ketamine|cannabis|drug|narcotic|suicide|overdose|abuse/gi;
  return text.replace(blocked, 'wellness');
}

// Generate a DALL-E 3 image and return the temporary URL
async function generateImage(frontmatter) {
  const category = frontmatter.category || 'wellness';
  const prompt = `A serene, photorealistic editorial hero image for a ${category} and longevity article about ${sanitizePrompt(frontmatter.description)}. Earthy, warm tones: sage greens, terracotta, cream, and natural wood. Soft natural lighting. Wide landscape format. Absolutely no text, no words, no letters, no writing, no labels, no numbers, no signage of any kind. No logos, no faces. Sophisticated, calming, and science-forward aesthetic.`;

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1792x1024',
    quality: 'standard',
  });

  return response.data[0].url;
}

// Download image from URL and return buffer
async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

// Upload image buffer to R2 and return permanent public URL
async function uploadToR2(slug, imageBuffer) {
  const key = `heroes/${slug}.jpg`;
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/jpeg',
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

// Update heroImage in a markdown file
async function updateHeroImage(filePath, newUrl) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    if (!content.includes('heroImage:')) return false;
    const updated = content.replace(/^heroImage:.*$/m, `heroImage: "${newUrl}"`);
    await fs.writeFile(filePath, updated, 'utf8');
    return true;
  } catch {
    return false;
  }
}

// Update image.json in a bundle directory
async function updateBundle(bundleDir, slug, title, newUrl) {
  const imagePath = path.join(bundleDir, 'image.json');
  try {
    await fs.writeFile(imagePath, JSON.stringify({
      id: slug,
      alt: title,
      credit: 'DALL-E 3 / OpenAI',
      sourceUrl: newUrl,
      usage: 'hero',
    }, null, 2), 'utf8');
  } catch {
    // Bundle may not exist — skip
  }
}

// --- Main ---
const articles = await findArticlesWithDefaultImages();

if (articles.length === 0) {
  console.log(targetSlug
    ? `No default image found for slug: ${targetSlug}`
    : 'No articles with default images found.');
  process.exit(0);
}

console.log(`Found ${articles.length} article(s) with default images. Generating DALL-E 3 replacements...\n`);

const DELAY_MS = 12_000;
let totalCost = 0;
let succeeded = 0;

for (let i = 0; i < articles.length; i++) {
  const { slug, frontmatter, filePath } = articles[i];
  console.log(`→ [${i + 1}/${articles.length}] ${slug}`);

  try {
    // Generate image
    const tempUrl = await generateImage(frontmatter);

    // Download from OpenAI (URL expires in ~1hr)
    const imageBuffer = await downloadImage(tempUrl);

    // Upload to R2
    const permanentUrl = await uploadToR2(slug, imageBuffer);

    // Update all files
    await updateHeroImage(filePath, permanentUrl);
    await updateHeroImage(path.join(contentRoot, 'validated', 'articles', `${slug}.md`), permanentUrl);
    await updateHeroImage(path.join(contentRoot, 'published', 'articles', `${slug}.md`), permanentUrl);
    await updateBundle(path.join(contentRoot, 'validated', `${slug}.bundle`), slug, frontmatter.title, permanentUrl);
    await updateBundle(path.join(contentRoot, 'published', `${slug}.bundle`), slug, frontmatter.title, permanentUrl);

    totalCost += 0.04;
    succeeded++;
    console.log(`  ✓ ${permanentUrl}`);
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message?.slice(0, 120)}`);
  }

  if (i < articles.length - 1) {
    console.log(`  ⏳ Waiting ${DELAY_MS / 1000}s...`);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
}

console.log(`\nDone. ${succeeded}/${articles.length} images generated and uploaded to R2. ~$${totalCost.toFixed(2)}`);
