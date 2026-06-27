// Demo: pull live frames via the internal DuoPlus client wired to the captured
// browser session. Proves the session token + DuoplusInternalClient work end-to-end.
//
//   node apps/api/scripts/duoplus-frames.mjs
//
// Reads DUOPLUS_SESSION_FILE (default ./duoplus-session.json). Writes sample JPEG
// frames to /tmp/duoplus-frames/ and prints a summary. No billing, no ADB.

import fs from 'node:fs';

import { loadRootEnv } from '@julio/config/env';

loadRootEnv();

const { createDuoplusInternalClient } = await import('@julio/api/utils/duoplus-session');
const { listFromDuoPlusInternal } = await import('@julio/device-control');

async function main() {
  const client = createDuoplusInternalClient();

  const controlList = await client.controlList({ regionTypeId: 'lyPSZ' });
  const phones = listFromDuoPlusInternal(controlList);
  const ids = phones.map((p) => p.id || p.image_id).filter(Boolean).slice(0, 6);
  console.log(`controlList: ${phones.length} phones | capturing: ${ids.join(', ')}`);

  const frames = await client.captureFrames(ids, { width: 320, height: 320, quality: 20 });
  const outDir = '/tmp/duoplus-frames';
  fs.mkdirSync(outDir, { recursive: true });
  let saved = 0;
  for (const f of frames) {
    if (!f.dataUrl) continue;
    const b64 = f.dataUrl.split(',')[1];
    fs.writeFileSync(`${outDir}/${f.imageId}.jpg`, Buffer.from(b64, 'base64'));
    saved += 1;
    console.log(`  ${f.imageId}: ${Math.round(b64.length * 0.75 / 1024)}KB JPEG (link_status=${f.linkStatus})`);
  }
  console.log(`✅ ${saved} live frames saved to ${outDir}/`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
