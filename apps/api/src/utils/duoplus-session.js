import fs from 'node:fs';

import { env } from '@julio/api/config/env';
import { DuoplusInternalClient } from '@julio/device-control';

// Loads the browser-captured DuoPlus session (Authorization token + cookies)
// written by apps/api/scripts/capture-session.mjs. The token is short-lived;
// re-run `yarn workspace @julio/api capture:session --preset duoplus` to refresh.

export function loadDuoplusSession(path = env.duoplusSessionFile) {
  if (!path) throw new Error('DUOPLUS_SESSION_FILE is not configured');
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch {
    throw new Error(
      `DuoPlus session not found at ${path}. Capture one with: yarn workspace @julio/api capture:session --preset duoplus`
    );
  }
  const authorization = String(raw.authorization || '').trim();
  if (!authorization) throw new Error(`DuoPlus session at ${path} has no Authorization token; re-capture it.`);
  return { authorization, cookies: raw.cookies || {}, capturedAt: raw.captured_at || null };
}

export function createDuoplusInternalClient(path = env.duoplusSessionFile) {
  const session = loadDuoplusSession(path);
  return new DuoplusInternalClient({ token: session.authorization });
}
