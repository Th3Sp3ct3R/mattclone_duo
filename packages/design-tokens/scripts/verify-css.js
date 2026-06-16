import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildTokensCss } from '../src/css.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const targetPath = join(__dirname, '..', 'src', 'tokens.css');
const expected = buildTokensCss().trim();
const actual = readFileSync(targetPath, 'utf8').trim();

if (expected !== actual) {
  throw new Error('tokens.css is out of sync with tokens.js. Run yarn build:css.');
}

