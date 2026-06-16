import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '../../..');
const primitivesDir = path.join(repoRoot, 'packages/ui/src/primitives');
const scssEntry = path.join(repoRoot, 'packages/ui/src/primitives.scss');

function isDirectoryEntry(ent) {
  return ent && typeof ent === 'object' && ent.isDirectory?.();
}

async function main() {
  const entries = await fs.readdir(primitivesDir, { withFileTypes: true });
  const primitiveDirs = entries
    .filter(isDirectoryEntry)
    .map((ent) => ent.name)
    .filter((name) => !name.startsWith('_'))
    .sort((a, b) => a.localeCompare(b));

  const created = [];

  for (const name of primitiveDirs) {
    const scssPath = path.join(primitivesDir, name, `${name}.scss`);
    try {
      await fs.access(scssPath);
    } catch {
      await fs.writeFile(scssPath, '', 'utf8');
      created.push(scssPath);
    }
  }

  const lines = [
    "// Auto-generated SCSS entry for primitives.",
    "// Import this in your app or Storybook to layer styles on primitives.",
    ""
  ];

  for (const name of primitiveDirs) {
    // Sass can import/compile empty files fine.
    lines.push(`@use './primitives/${name}/${name}.scss';`);
  }

  lines.push('');
  await fs.writeFile(scssEntry, lines.join('\n'), 'utf8');

  console.log(`Created ${created.length} per-primitive SCSS files.`);
  console.log(`Wrote ${path.relative(repoRoot, scssEntry)}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


