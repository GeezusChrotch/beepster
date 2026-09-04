#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const [, , emojiTestPath, twemojiDirectory, outputDirectory] = process.argv;

if (!emojiTestPath || !twemojiDirectory || !outputDirectory) {
  console.error('usage: build-emoji-assets.mjs EMOJI_TEST TWEMOJI_72X72 OUTPUT_DIRECTORY');
  process.exit(2);
}

const CELL_SIZE = 24;
const COLUMNS = 64;
const source = await readFile(emojiTestPath, 'utf8');
const entries = [];
const seen = new Set();
let group = '';
let subgroup = '';

for (const line of source.split(/\r?\n/)) {
  const groupMatch = line.match(/^# group: (.+)$/);
  if (groupMatch) {
    group = groupMatch[1];
    continue;
  }
  const subgroupMatch = line.match(/^# subgroup: (.+)$/);
  if (subgroupMatch) {
    subgroup = subgroupMatch[1];
    continue;
  }
  const match = line.match(/^([0-9A-F ]+)\s*;\s*fully-qualified\s*#\s*\S+\s+E[\d.]+\s+(.+)$/);
  if (!match) continue;
  const codePoints = match[1].trim().split(/\s+/).map(value => Number.parseInt(value, 16));
  const exactKey = codePoints.map(value => value.toString(16)).join('-');
  const compactKey = codePoints.filter(value => value !== 0xfe0f).map(value => value.toString(16)).join('-');
  const key = existsSync(join(twemojiDirectory, `${exactKey}.png`)) ? exactKey : compactKey;
  if (!key || seen.has(key)) continue;
  const imagePath = join(twemojiDirectory, `${key}.png`);
  if (!existsSync(imagePath)) continue;
  seen.add(key);
  entries.push({
    id: entries.length,
    key,
    emoji: String.fromCodePoint(...codePoints),
    label: match[2].trim(),
    group,
    subgroup,
    imagePath
  });
}

if (entries.length < 3000) throw new Error(`Only ${entries.length} emoji matched Twemoji artwork`);

await mkdir(outputDirectory, { recursive: true });
const workDirectory = await mkdtemp(join(tmpdir(), 'beepster-emoji-assets-'));
try {
const listPath = join(workDirectory, 'images.txt');
const atlasPath = join(outputDirectory, 'emoji-atlas-24.png');
const rgbaPath = join(workDirectory, 'emoji-atlas.rgba');
await writeFile(listPath, `${entries.map(entry => entry.imagePath).join('\n')}\n`);

await execFile('magick', [
  'montage', `@${listPath}`, '-font', '/System/Library/Fonts/Helvetica.ttc',
  '-background', 'none', '-tile', `${COLUMNS}x`,
  '-geometry', `${CELL_SIZE}x${CELL_SIZE}+0+0`, atlasPath
], { maxBuffer: 8 * 1024 * 1024 });

const rows = Math.ceil(entries.length / COLUMNS);
await execFile('magick', [atlasPath, '-depth', '8', '-colors', '64', `PNG8:${atlasPath}`]);
await execFile('magick', [atlasPath, '-alpha', 'on', '-depth', '8', `RGBA:${rgbaPath}`]);
const rgba = await readFile(rgbaPath);
const expectedPixels = COLUMNS * CELL_SIZE * rows * CELL_SIZE;
if (rgba.length !== expectedPixels * 4) {
  throw new Error(`Unexpected atlas size: ${rgba.length} bytes for ${expectedPixels} pixels`);
}
const pixels = Buffer.alloc(expectedPixels);
for (let sourceOffset = 0, targetOffset = 0; sourceOffset < rgba.length; sourceOffset += 4, targetOffset++) {
  const alpha = rgba[sourceOffset + 3];
  if (alpha < 128) {
    pixels[targetOffset] = 0;
    continue;
  }
  const red = Math.round(rgba[sourceOffset] / 85);
  const green = Math.round(rgba[sourceOffset + 1] / 85);
  const blue = Math.round(rgba[sourceOffset + 2] / 85);
  pixels[targetOffset] = 0xc0 | (red << 4) | (green << 2) | blue;
}

await writeFile(join(outputDirectory, 'emoji-atlas-24.raw'), pixels);
await writeFile(join(outputDirectory, 'emoji-catalog.json'), `${JSON.stringify({
  version: 1,
  source: 'Twemoji and Unicode Emoji 17.0',
  cellSize: CELL_SIZE,
  columns: COLUMNS,
  rows,
  entries: entries.map(({ imagePath, ...entry }) => entry)
})}\n`);

console.log(`Built ${entries.length} emoji in ${basename(atlasPath)} (${COLUMNS}x${rows} cells)`);
} finally {
  await rm(workDirectory, { recursive: true, force: true });
}
