#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('../..', import.meta.url).pathname);
const azaRoot = path.resolve(process.env.AZA_MEMORY_ROOT || '/Users/growthgod/VAN/aza_memory');
const projectId = process.env.AZA_PROJECT_ID || 'mattclone_duo';
const outDir = path.join(azaRoot, 'projects', projectId);

const SKIP_DIRS = new Set([
  '.git',
  '.next',
  '.turbo',
  '.cache',
  'coverage',
  'dist',
  'build',
  'generated',
  'node_modules',
  'tmp',
]);

const SECRET_KEY_RE = /(api[_-]?key|authorization|auth[_-]?token|bearer|cookie|csrf|credential|duoplus[_-]?api[_-]?key|mongodb[_-]?uri|otp|passwd|password|private[_-]?key|proxy|secret|session|signed[_-]?url|token|totp)/i;
const URL_CREDENTIAL_RE = /\b([a-z][a-z0-9+.-]*:\/\/)([^:@\s/]+):([^@\s/]+)@/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const LONG_SECRET_RE = /\b(?:sk|pk|ghp|gho|ghu|ghs|xox[baprs]|AIza|AKIA)[A-Za-z0-9_-]{12,}\b/g;

let redactionCount = 0;

function execGit(args, fallback = '') {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    return fallback;
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function listFiles(root, predicate = () => true) {
  const results = [];

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(repoRoot, full);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (predicate(rel, full)) results.push(rel);
    }
  }

  if (existsSync(root)) walk(root);
  return results.sort();
}

function redact(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (SECRET_KEY_RE.test(key)) {
          redactionCount++;
          return [key, '[REDACTED]'];
        }
        return [key, redact(item)];
      })
    );
  }
  if (typeof value !== 'string') return value;

  let next = value
    .replace(URL_CREDENTIAL_RE, (_match, proto) => {
      redactionCount++;
      return `${proto}[REDACTED]@`;
    })
    .replace(JWT_RE, () => {
      redactionCount++;
      return '[REDACTED_JWT]';
    })
    .replace(LONG_SECRET_RE, () => {
      redactionCount++;
      return '[REDACTED_SECRET]';
    });

  if (SECRET_KEY_RE.test(next) && /[:=]\s*['"]?[^'"\s]+/.test(next)) {
    next = next.replace(/([A-Z0-9_ -]*(?:api[_-]?key|authorization|auth[_-]?token|cookie|credential|password|secret|session|token)[A-Z0-9_ -]*\s*[:=]\s*)['"]?[^'",\s]+['"]?/gi, (_match, prefix) => {
      redactionCount++;
      return `${prefix}[REDACTED]`;
    });
  }

  return next;
}

function readSafe(filePath, maxChars = 24000) {
  const text = readFileSync(path.join(repoRoot, filePath), 'utf8').slice(0, maxChars);
  return redact(text);
}

function mdTable(headers, rows) {
  const header = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replace(/\n/g, '<br>')).join(' | ')} |`);
  return [header, sep, ...body].join('\n');
}

function packageSummary() {
  const packageFiles = listFiles(repoRoot, (rel) => rel === 'package.json' || /^apps\/[^/]+\/package\.json$/.test(rel) || /^packages\/[^/]+\/package\.json$/.test(rel));
  return packageFiles.map((rel) => {
    const pkg = readJson(path.join(repoRoot, rel));
    return {
      path: rel,
      name: pkg?.name || path.dirname(rel),
      scripts: Object.keys(pkg?.scripts || {}).sort(),
      dependencies: Object.keys(pkg?.dependencies || {}).sort(),
      devDependencies: Object.keys(pkg?.devDependencies || {}).sort(),
    };
  });
}

function routeSummary() {
  const files = listFiles(path.join(repoRoot, 'apps/api/src'), (rel) => /\.(js|mjs|ts)$/.test(rel) && /\/(app|routes|controllers)\//.test(`/${rel}`));
  const rows = [];
  const routeRe = /\b(?:router|app)\.(get|post|put|patch|delete|use)\(\s*['"`]([^'"`]+)['"`]/gi;
  const compatRe = /\bapp\.use\(\s*['"`]([^'"`]+)['"`]\s*,\s*([A-Za-z0-9_]+)/g;

  for (const rel of files) {
    const text = readSafe(rel, 40000);
    for (const match of text.matchAll(routeRe)) {
      rows.push({ file: rel, method: match[1].toUpperCase(), path: match[2] });
    }
    for (const match of text.matchAll(compatRe)) {
      rows.push({ file: rel, method: 'USE', path: `${match[1]} -> ${match[2]}` });
    }
  }

  return rows.sort((a, b) => `${a.path}${a.method}`.localeCompare(`${b.path}${b.method}`));
}

function modelSummary() {
  const files = listFiles(path.join(repoRoot, 'apps/api/src/models'), (rel) => /\.(js|mjs|ts)$/.test(rel));
  return files.map((rel) => {
    const text = readSafe(rel, 40000);
    const schemaNames = [...text.matchAll(/\bconst\s+([A-Za-z0-9_]+Schema)\s*=/g)].map((m) => m[1]);
    const modelNames = [...text.matchAll(/\bmongoose\.model\(\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);
    const indexes = [...text.matchAll(/\.index\(\s*(\{[^)]{0,180}\})/g)].map((m) => m[1].replace(/\s+/g, ' '));
    return {
      file: rel,
      schemas: schemaNames,
      models: modelNames,
      indexes,
    };
  });
}

function frontendRoutes() {
  const files = listFiles(path.join(repoRoot, 'apps/web-next/app'), (rel) => /\/(page|route)\.(js|jsx|ts|tsx)$/.test(rel));
  return files.map((rel) => {
    let route = rel
      .replace(/^apps\/web-next\/app/, '')
      .replace(/\/(page|route)\.(js|jsx|ts|tsx)$/, '')
      .replace(/\/\(([^)]+)\)/g, '')
      .replace(/\/index$/, '');
    if (!route) route = '/';
    return { route, file: rel };
  });
}

function docsIndex() {
  const files = listFiles(path.join(repoRoot, 'docs'), (rel) => /\.md$/.test(rel));
  return files.map((rel) => {
    const text = readSafe(rel, 12000);
    const headings = [...text.matchAll(/^#{1,3}\s+(.+)$/gm)].slice(0, 12).map((m) => m[1]);
    return { file: rel, headings };
  });
}

function duoplusSurface() {
  const files = listFiles(repoRoot, (rel) => {
    if (!/\.(js|jsx|mjs|ts|tsx|md)$/.test(rel)) return false;
    return /duoplus|device-control|engine-device|engine\/components|proxy-assignment|focus/i.test(rel);
  });

  return files.slice(0, 120).map((rel) => {
    const text = readSafe(rel, 30000);
    const exports = [...text.matchAll(/\bexport\s+(?:async\s+)?(?:function|class|const)\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]);
    const functions = [...text.matchAll(/\b(?:async\s+)?function\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]);
    const commands = [...text.matchAll(/\bcommand\s*:\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);
    const envNames = [...text.matchAll(/\b(?:DUOPLUS|MONGODB|ENGINE|NEXT_PUBLIC)_[A-Z0-9_]+\b/g)].map((m) => m[0]);
    return {
      file: rel,
      exports: [...new Set(exports)].slice(0, 20),
      functions: [...new Set(functions)].slice(0, 20),
      commands: [...new Set(commands)].slice(0, 30),
      envNames: [...new Set(envNames)].sort(),
    };
  });
}

function writeArtifact(name, content) {
  writeFileSync(path.join(outDir, name), content);
}

function main() {
  if (!existsSync(azaRoot)) {
    throw new Error(`AzA root not found: ${azaRoot}`);
  }
  mkdirSync(outDir, { recursive: true });

  const generatedAt = new Date().toISOString();
  const metadata = {
    projectId,
    generatedAt,
    sourceRepo: repoRoot,
    git: {
      branch: execGit(['branch', '--show-current']),
      commit: execGit(['rev-parse', 'HEAD']),
      shortCommit: execGit(['rev-parse', '--short', 'HEAD']),
      remotes: redact(execGit(['remote', '-v']).split('\n').filter(Boolean)),
      dirtyFiles: execGit(['status', '--short']).split('\n').filter(Boolean),
    },
    outputDir: outDir,
    redaction: {
      policy: 'secret-shaped keys, credential URLs, JWT-like tokens, provider/API key prefixes',
      count: 0,
    },
  };

  const packages = packageSummary();
  const routes = routeSummary();
  const models = modelSummary();
  const frontRoutes = frontendRoutes();
  const docs = docsIndex();
  const duoplus = duoplusSurface();

  const repoManifest = `# mattclone_duo Repo Manifest

Generated: ${generatedAt}

Source repo: \`${repoRoot}\`
Branch: \`${metadata.git.branch}\`
Commit: \`${metadata.git.shortCommit}\`

## Safety

This is a curated AzA project context export. It intentionally excludes raw source copies, runtime artifacts, browser sessions, cookies, HARs, raw logs, screenshots, \`.env\` files, and dependency folders.

## Git State

${metadata.git.dirtyFiles.length ? metadata.git.dirtyFiles.map((line) => `- \`${redact(line)}\``).join('\n') : '- Working tree clean at export time.'}

## Workspaces

${mdTable(['Package', 'Path', 'Scripts'], packages.map((pkg) => [pkg.name, pkg.path, pkg.scripts.join(', ')]))}
`;

  const architecture = `# mattclone_duo Architecture Snapshot

Generated: ${generatedAt}

## Boundaries

- \`apps/api\`: Express/Mongo API, engine devices/accounts/proxies, DuoPlus fallback adapter, event stream services.
- \`apps/web-next\`: Next.js operator/admin UI, including \`/engine\` and DuoPlus focus fallback surfaces.
- \`packages/device-control\`: provider abstractions and device-control helpers.
- \`packages/ui\` and \`packages/design-tokens\`: shared frontend design primitives.
- \`docs\`: curated project decisions, DuoPlus endpoint notes, and integration plans.

## Dependency Signals

${mdTable(['Package', 'Runtime deps'], packages.map((pkg) => [pkg.name, pkg.dependencies.slice(0, 24).join(', ')]))}
`;

  const apiRoutes = `# mattclone_duo API Routes

Generated: ${generatedAt}

${mdTable(['Method', 'Path', 'File'], routes.map((route) => [route.method, route.path, route.file]))}
`;

  const dataModels = `# mattclone_duo Data Models

Generated: ${generatedAt}

${mdTable(['File', 'Schemas', 'Models', 'Indexes'], models.map((model) => [
    model.file,
    model.schemas.join(', '),
    model.models.join(', '),
    model.indexes.join('<br>'),
  ]))}
`;

  const frontendSurfaces = `# mattclone_duo Frontend Surfaces

Generated: ${generatedAt}

${mdTable(['Route', 'File'], frontRoutes.map((route) => [route.route, route.file]))}
`;

  const docsMd = `# mattclone_duo Docs Index

Generated: ${generatedAt}

${mdTable(['File', 'Headings'], docs.map((doc) => [doc.file, doc.headings.join('<br>')]))}
`;

  const duoplusMd = `# mattclone_duo DuoPlus Operator Contract

Generated: ${generatedAt}

## Current Direction

- Ship fallback operator support through documented OpenAPI and safe local adapter routes.
- Keep private live stream/control proxying disabled until separately reviewed.
- Treat coordinate discovery as probe-first; real engagement actions require explicit approval.
- Keep credentials, proxy passwords, raw sessions, OTPs, cookies, auth headers, signed URLs, screenshots with sensitive account state, and DuoPlus API keys out of frontend/API responses and memory artifacts.

## Relevant Surfaces

${mdTable(['File', 'Exports', 'Functions', 'Commands', 'Env names'], duoplus.map((item) => [
    item.file,
    item.exports.join(', '),
    item.functions.join(', '),
    item.commands.join(', '),
    item.envNames.join(', '),
  ]))}
`;

  const finalMetadata = {
    ...metadata,
    generatedFiles: [
      'repo-manifest.md',
      'architecture.md',
      'api-routes.md',
      'data-models.md',
      'frontend-surfaces.md',
      'docs-index.md',
      'duoplus-operator-contract.md',
      'ingestion-metadata.json',
    ],
    counts: {
      packages: packages.length,
      apiRoutes: routes.length,
      dataModels: models.length,
      frontendRoutes: frontRoutes.length,
      docs: docs.length,
      duoplusSurfaces: duoplus.length,
    },
  };
  finalMetadata.redaction.count = redactionCount;

  writeArtifact('repo-manifest.md', repoManifest);
  writeArtifact('architecture.md', architecture);
  writeArtifact('api-routes.md', apiRoutes);
  writeArtifact('data-models.md', dataModels);
  writeArtifact('frontend-surfaces.md', frontendSurfaces);
  writeArtifact('docs-index.md', docsMd);
  writeArtifact('duoplus-operator-contract.md', duoplusMd);
  writeArtifact('ingestion-metadata.json', `${JSON.stringify(redact(finalMetadata), null, 2)}\n`);

  console.log(JSON.stringify({
    ok: true,
    outDir,
    generatedFiles: finalMetadata.generatedFiles,
    counts: finalMetadata.counts,
    redactions: redactionCount,
  }, null, 2));
}

main();
