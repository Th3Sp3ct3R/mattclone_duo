import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildTokensCss } from '../src/css.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const targetPath = join(__dirname, '..', 'src', 'tokens.css');

writeFileSync(targetPath, buildTokensCss());

