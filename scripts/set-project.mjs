#!/usr/bin/env node
/**
 * Replace scaffold placeholders across the monorepo.
 *
 * Replaces:
 * - julio -> provided --slug (project slug / human name)
 * - @julio -> @<scope> (npm scope, with leading "@")
 *
 * Examples:
 *   node ./scripts/set-project.mjs --slug rabbithole --scope rabbithole
 *   node ./scripts/set-project.mjs --slug my-app --scope myorg --dry-run
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

function usage(exitCode = 1) {
  console.log('Usage: node ./scripts/set-project.mjs --slug <projectSlug> --scope <npmScope> [--dry-run]');
  console.log('');
  console.log('Notes:');
  console.log('- npm scope should be provided WITHOUT "@", e.g. "rabbithole" for packages like "@rabbithole/shared".');
  console.log('- This will update many files (package names, imports, config, .env files, etc.).');
  process.exit(exitCode);
}

function parseArgs(argv) {
  const out = { slug: null, scope: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--slug') out.slug = argv[++i];
    else if (a === '--scope') out.scope = argv[++i];
    else if (a === '-h' || a === '--help') usage(0);
    else if (!a.startsWith('-') && !out.slug) out.slug = a;
    else if (!a.startsWith('-') && !out.scope) out.scope = a;
    else usage(1);
  }
  return out;
}

function validateSlug(slug) {
  // Safe for filenames/titles/cookies.
  return typeof slug === 'string' && /^[a-z0-9][a-z0-9._-]*$/i.test(slug);
}

function validateScope(scope) {
  // Enforce lowercase for npm scope.
  return typeof scope === 'string' && /^[a-z0-9][a-z0-9._-]*$/.test(scope);
}

async function isProbablyTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const binaryExts = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.ico',
    '.zip',
    '.gz',
    '.tgz',
    '.pdf',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.mp4',
    '.mov',
    '.mp3'
  ]);
  if (binaryExts.has(ext)) return false;
  return true;
}

async function walk(dir, { ignoreDirs }) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ignoreDirs.has(ent.name)) continue;
      out.push(...(await walk(full, { ignoreDirs })));
    } else if (ent.isFile()) {
      out.push(full);
    }
  }
  return out;
}

async function replaceInFile(filePath, replacements) {
  if (!(await isProbablyTextFile(filePath))) return { changed: false };
  let before;
  try {
    before = await fs.readFile(filePath, 'utf8');
  } catch {
    return { changed: false };
  }

  let after = before;
  for (const [from, to] of replacements) after = after.split(from).join(to);

  if (after === before) return { changed: false };
  await fs.writeFile(filePath, after, 'utf8');
  return { changed: true };
}

async function main() {
  const { slug, scope, dryRun } = parseArgs(process.argv.slice(2));
  if (!slug || !scope) usage(1);

  const cleanScope = scope.startsWith('@') ? scope.slice(1) : scope;
  const scoped = `@${cleanScope}`;

  if (!validateSlug(slug)) {
    console.error('Invalid --slug. Use letters/numbers and . _ - only (start with letter/number).');
    process.exit(1);
  }
  if (!validateScope(cleanScope)) {
    console.error('Invalid --scope. Use lowercase letters/numbers and . _ - only (no "@").');
    process.exit(1);
  }

  const ignoreDirs = new Set(['node_modules', 'dist', 'coverage', '.git', '.expo', '.expo-shared']);

  const files = await walk(ROOT, { ignoreDirs });
  const replacements = [
    // Scope must be replaced first to avoid leaving "@julio" partially updated.
    ['@julio', scoped],
    ['julio', slug]
  ];

  let changedCount = 0;
  let scannedCount = 0;
  const changedFiles = [];

  for (const f of files) {
    scannedCount++;
    if (dryRun) {
      let before;
      try {
        before = await fs.readFile(f, 'utf8');
      } catch {
        continue;
      }
      let after = before;
      for (const [from, to] of replacements) after = after.split(from).join(to);
      if (after !== before) {
        changedCount++;
        changedFiles.push(path.relative(ROOT, f));
      }
      continue;
    }

    const res = await replaceInFile(f, replacements);
    if (res.changed) {
      changedCount++;
      changedFiles.push(path.relative(ROOT, f));
    }
  }

  console.log(dryRun ? '[dry-run] completed' : 'completed');
  console.log(`scanned: ${scannedCount} files`);
  console.log(`changed: ${changedCount} files`);
  if (changedFiles.length) {
    console.log('');
    console.log('Changed files:');
    for (const f of changedFiles) console.log(`- ${f}`);
  }

  if (dryRun) {
    console.log('');
    console.log('Run again without --dry-run to apply changes.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


