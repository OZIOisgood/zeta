import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

const [inputArg, outputArg = 'web/landing/public/index.html'] = process.argv.slice(2);

if (!inputArg) {
  console.error('Usage: node web/landing/scripts/unpack-export.mjs <export.html> [output.html]');
  process.exit(1);
}

const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg);
const outputDir = dirname(outputPath);
const source = await readFile(inputPath, 'utf8');

const manifestMatch = source.match(
  /<script type="__bundler\/manifest">([\s\S]*?)<\/script>/,
);
const templateMatch = source.match(
  /<script type="__bundler\/template">([\s\S]*?)<\/script>/,
);

if (!manifestMatch || !templateMatch) {
  throw new Error(`${inputPath} is not a supported bundled HTML export`);
}

const manifest = JSON.parse(manifestMatch[1]);
let html = JSON.parse(templateMatch[1]);
const assetPaths = new Map();
const mimeExtensions = new Map([
  ['font/woff2', '.woff2'],
  ['image/png', '.png'],
  ['image/svg+xml', '.svg'],
  ['text/javascript', '.js'],
  ['application/javascript', '.js'],
  ['text/jsx', '.jsx'],
]);

for (const [id, entry] of Object.entries(manifest)) {
  const extension = mimeExtensions.get(entry.mime) || extname(id) || '.bin';
  const relativePath = join('assets', 'export', `${id}${extension}`);
  const encoded = Buffer.from(entry.data, 'base64');
  const bytes = entry.compressed ? gunzipSync(encoded) : encoded;

  await mkdir(join(outputDir, dirname(relativePath)), { recursive: true });
  await writeFile(join(outputDir, relativePath), bytes);
  assetPaths.set(id, relativePath);
}

for (const [id, relativePath] of assetPaths) {
  html = html.split(id).join(relativePath);
}

html = html
  .replace(/\s+integrity="[^"]*"/gi, '')
  .replace(/\s+crossorigin="[^"]*"/gi, '');

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, html);

console.log(`Unpacked ${Object.keys(manifest).length} assets into ${outputDir}`);
console.log(`Wrote ${outputPath}`);
