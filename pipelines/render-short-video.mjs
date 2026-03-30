#!/usr/bin/env node
/**
 * render-short-video.mjs
 *
 * Renders a simple vertical MP4 from an approved short-form video package using ffmpeg.
 *
 * Outputs under content-system/social/shorts/<slug>/:
 * - subtitles.srt
 * - render-plan.json
 * - short.mp4
 * - cover.jpg
 *
 * Usage:
 *   node pipelines/render-short-video.mjs
 *   node pipelines/render-short-video.mjs <slug>
 *
 * Notes:
 * - Requires ffmpeg in PATH
 * - Only renders packages whose review.status is "approved"
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ensureDir, fileExists, readJson } from './content-utils.mjs';
import { publishedDir, validatedDir } from './content-config.mjs';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(__dirname, '..');
const targetSlug = process.argv[2] || null;
const FFMPEG_BIN = process.env.FFMPEG_BIN || 'ffmpeg';

const SOCIAL_ROOT = path.join(contentRoot, 'social', 'shorts');
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DEFAULT_SCENE_SECONDS = 5;
const BASE_COLOR = '0x13201B';
const FONT_CANDIDATES = [
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/Library/Fonts/Arial Bold.ttf',
];

function escapeDrawtext(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\\\'")
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/,/g, '\\,')
    .replace(/%/g, '\\%');
}

function escapeSubtitleText(value) {
  return String(value).replace(/\r/g, '').trim();
}

function secondsToTimestamp(totalSeconds) {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(Math.floor(totalSeconds % 60)).padStart(2, '0');
  const millis = String(Math.round((totalSeconds % 1) * 1000)).padStart(3, '0');
  return `${hours}:${minutes}:${seconds},${millis}`;
}

async function resolveFont() {
  for (const candidate of FONT_CANDIDATES) {
    if (await fileExists(candidate)) return candidate;
  }
  return null;
}

async function ensureFfmpeg() {
  try {
    await execFileAsync(FFMPEG_BIN, ['-version']);
  } catch (error) {
    console.error(`ffmpeg is required to render short videos. Tried: ${FFMPEG_BIN}`);
    console.error('Install ffmpeg locally, set FFMPEG_BIN to its path, or run this in GitHub Actions where ffmpeg is available.');
    process.exit(1);
  }
}

async function detectDrawtextSupport() {
  try {
    const { stdout, stderr } = await execFileAsync(FFMPEG_BIN, ['-filters']);
    const output = `${stdout}\n${stderr}`;
    return output.includes('drawtext');
  } catch {
    return false;
  }
}

async function findApprovedPackages() {
  const results = [];

  for (const baseDir of [validatedDir, publishedDir]) {
    const bundleRoot = path.join(baseDir, '..');
    const articleDir = baseDir;
    let files = [];
    try {
      files = await fs.readdir(articleDir);
    } catch {
      continue;
    }

    for (const fileName of files.filter((file) => file.endsWith('.md'))) {
      const slug = fileName.replace(/\.md$/, '');
      if (targetSlug && slug !== targetSlug) continue;

      const videoJsonPath = path.join(bundleRoot, `${slug}.bundle`, 'video.json');
      if (!(await fileExists(videoJsonPath))) continue;

      const videoJson = await readJson(videoJsonPath);
      if (videoJson.review?.status !== 'approved') continue;

      results.push({
        slug,
        videoJsonPath,
        bundleDir: path.dirname(videoJsonPath),
        shortDir: path.join(SOCIAL_ROOT, slug),
        videoJson,
      });
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const item of results) {
    if (seen.has(item.slug)) continue;
    deduped.push(item);
    seen.add(item.slug);
  }
  return deduped;
}

function buildScenes(videoJson) {
  const rawScenes = [
    videoJson.script?.hook,
    ...(Array.isArray(videoJson.script?.beats) ? videoJson.script.beats : []),
    videoJson.script?.close,
  ].filter(Boolean).map((text) => escapeSubtitleText(text));

  return rawScenes.map((text, index) => ({
    index,
    text,
    start: index * DEFAULT_SCENE_SECONDS,
    end: (index + 1) * DEFAULT_SCENE_SECONDS,
  }));
}

function buildSrt(scenes) {
  return scenes.map((scene, idx) => (
    `${idx + 1}\n${secondsToTimestamp(scene.start)} --> ${secondsToTimestamp(scene.end)}\n${scene.text}\n`
  )).join('\n');
}

function buildFilterComplex(fontPath, scenes) {
  const base = ['[0:v]format=yuv420p'];

  scenes.forEach((scene) => {
    const escapedText = escapeDrawtext(scene.text);
    base.push(
      `drawtext=fontfile='${fontPath}':text='${escapedText}':fontcolor=0xF6F1E8:fontsize=68:line_spacing=16:x=(w-text_w)/2:y=(h-text_h)/2-120:box=1:boxcolor=0x1D2A24@0.55:boxborderw=28:enable='between(t,${scene.start},${scene.end - 0.05})'`
    );
  });

  base.push(
    "drawtext=fontfile='" + fontPath + "':text='BestKarma':fontcolor=0xA6B79A:fontsize=42:x=(w-text_w)/2:y=h-210"
  );
  base.push(
    "drawtext=fontfile='" + fontPath + "':text='Live well. Age wisely.':fontcolor=0xF6F1E8:fontsize=34:x=(w-text_w)/2:y=h-150"
  );

  return base.join(',');
}

async function renderPackage(pkg, fontPath) {
  await ensureDir(pkg.shortDir);
  const scenes = buildScenes(pkg.videoJson);
  if (scenes.length === 0) {
    throw new Error('Video package has no script scenes to render.');
  }

  const totalDuration = scenes[scenes.length - 1].end;
  const subtitlePath = path.join(pkg.shortDir, 'subtitles.srt');
  const renderPlanPath = path.join(pkg.shortDir, 'render-plan.json');
  const outputPath = path.join(pkg.shortDir, 'short.mp4');
  const coverPath = path.join(pkg.shortDir, 'cover.jpg');

  await fs.writeFile(subtitlePath, `${buildSrt(scenes)}\n`, 'utf8');
  await fs.writeFile(renderPlanPath, `${JSON.stringify({
    slug: pkg.slug,
    scenes,
    width: WIDTH,
    height: HEIGHT,
    fps: FPS,
    renderedAt: new Date().toISOString(),
  }, null, 2)}\n`, 'utf8');

  const supportsDrawtext = Boolean(fontPath);
  const filterComplex = supportsDrawtext ? buildFilterComplex(fontPath, scenes) : '[0:v]format=yuv420p';
  const background = `color=c=${BASE_COLOR}:s=1080x1920:r=30`;

  await execFileAsync(FFMPEG_BIN, [
    '-y',
    '-f', 'lavfi',
    '-i', background,
    '-t', String(totalDuration),
    '-vf', filterComplex,
    '-r', String(FPS),
    '-pix_fmt', 'yuv420p',
    '-c:v', 'libx264',
    '-movflags', '+faststart',
    outputPath,
  ]);

  await execFileAsync(FFMPEG_BIN, [
    '-y',
    '-i', outputPath,
    '-ss', '0',
    '-vframes', '1',
    coverPath,
  ]);

  pkg.videoJson.status = 'rendered';
  pkg.videoJson.renderAssets = {
    ...(pkg.videoJson.renderAssets || {}),
    videoPath: path.relative(contentRoot, outputPath),
    coverImagePath: path.relative(contentRoot, coverPath),
    subtitlePath: path.relative(contentRoot, subtitlePath),
  };

  await fs.writeFile(pkg.videoJsonPath, `${JSON.stringify(pkg.videoJson, null, 2)}\n`, 'utf8');

  if (!supportsDrawtext) {
    console.warn(`  ! Rendered fallback video for ${pkg.slug} without burned-in text because drawtext is unavailable in this ffmpeg build.`);
  }
}

await ensureFfmpeg();
const drawtextSupported = await detectDrawtextSupport();
const fontPath = drawtextSupported ? await resolveFont() : null;
if (drawtextSupported && !fontPath) {
  console.warn('drawtext is available but no supported font file was found. Falling back to background-only render.');
}

const packages = await findApprovedPackages();
if (packages.length === 0) {
  console.log(targetSlug
    ? `No approved video package found for slug: ${targetSlug}`
    : 'No approved video packages found to render.');
  process.exit(0);
}

console.log(`Rendering ${packages.length} approved short video package(s)...\n`);

for (let i = 0; i < packages.length; i++) {
  const pkg = packages[i];
  console.log(`→ [${i + 1}/${packages.length}] ${pkg.slug}`);
  try {
    await renderPackage(pkg, fontPath);
    console.log(`  ✓ Rendered social/shorts/${pkg.slug}/short.mp4`);
  } catch (error) {
    console.error(`  ✗ Failed: ${error.message}`);
  }
}

console.log('\nDone.');
