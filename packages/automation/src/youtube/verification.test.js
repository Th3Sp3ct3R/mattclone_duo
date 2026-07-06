import { handleYouTubeTwoFactor } from './ui-flows.js';
import { totpCandidates } from '@julio/integrations';

const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
// Realistic uiautomator nodes: a focused code field + a Next button.
const DUMP =
  '<hierarchy>' +
  '<node index="0" text="" resource-id="" class="android.widget.EditText" bounds="[100,200][900,300]" />' +
  '<node index="1" text="Next" class="android.widget.Button" bounds="[100,400][900,500]" />' +
  '</hierarchy>';

function fakeController(dumpXml) {
  const typed = [];
  const taps = [];
  return {
    typed,
    taps,
    async getUIDump() { return dumpXml; },
    async tap(x, y) { taps.push([x, y]); },
    async inputText(v) { typed.push(v); },
    async clearField() {}
  };
}

test('types a valid TOTP code into the 2-Step field', async () => {
  const c = fakeController(DUMP);
  await handleYouTubeTwoFactor(c, SECRET);
  const candidates = totpCandidates(SECRET);
  expect(c.typed.some((v) => candidates.includes(v))).toBe(true);
}, 20_000);

test('no-op when no TOTP seed (caller checkpoints)', async () => {
  const c = fakeController(DUMP);
  await handleYouTubeTwoFactor(c, '');
  expect(c.typed).toEqual([]);
});
