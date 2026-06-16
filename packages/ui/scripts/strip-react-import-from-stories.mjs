import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '../../..');
const primitivesDir = path.join(repoRoot, 'packages/ui/src/primitives');

function isDirectoryEntry(ent) {
  return ent && typeof ent === 'object' && ent.isDirectory?.();
}

async function main() {
  const entries = await fs.readdir(primitivesDir, { withFileTypes: true });
  const primitiveDirs = entries
    .filter(isDirectoryEntry)
    .map((ent) => ent.name)
    .filter((name) => !name.startsWith('_'));

  let changed = 0;
  let scanned = 0;

  for (const name of primitiveDirs) {
    const storyFile = path.join(primitivesDir, name, `${name}.stories.jsx`);
    try {
      const content = await fs.readFile(storyFile, 'utf8');
      scanned += 1;
      const next = content.replace(/^import \* as React from 'react';\n/m, '');
      if (next !== content) {
        await fs.writeFile(storyFile, next, 'utf8');
        changed += 1;
      }
    } catch {
      // ignore missing stories
    }
  }

  console.log(`Scanned ${scanned} story files, removed React import in ${changed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


