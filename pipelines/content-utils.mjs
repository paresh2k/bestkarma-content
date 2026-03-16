import fs from 'node:fs/promises';
import path from 'node:path';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

function parseScalar(rawValue) {
  const value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);

  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) =>
        (item.startsWith('"') && item.endsWith('"')) || (item.startsWith("'") && item.endsWith("'"))
          ? item.slice(1, -1)
          : item
      );
  }

  return value;
}

export function parseFrontmatter(fileContents) {
  const match = fileContents.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error('Missing frontmatter block.');
  }

  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1);
    frontmatter[key] = parseScalar(rawValue);
  }

  return frontmatter;
}

export async function getMarkdownFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => path.join(dir, entry.name))
      .sort();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function readJson(filePath) {
  const contents = await fs.readFile(filePath, 'utf8');
  return JSON.parse(contents);
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export function slugFromPath(filePath) {
  return path.basename(filePath, path.extname(filePath));
}
