// WhatsApp on-device UI flows.
//
// ⚠️ VERIFY-BY-FACT SEAM: the selector STRINGS + fallback tap points live in
// ./constants.js and are English/version SEEDS captured from docs, not a live
// DuoPlus WhatsApp dump. What is TESTED here is the CONTROL FLOW and ban
// handling (parse → classify → decide) against a fake controller with canned
// XML — NOT that a given label/resource-id/coordinate is correct on a real
// device. Re-capture the real UI (getUIDump/screenshot) and reconcile
// constants.js before trusting reportTarget in production.
import { findByResourceId, findElement, getAllText, parseUIDump } from '@julio/device-control';
import { domainError } from '@julio/whatsapp';

import { createHumanActor } from '../human-actor.js';
import {
  WHATSAPP_BAN_TEXTS,
  WHATSAPP_DISMISS_TEXTS,
  WHATSAPP_HOME_TEXTS,
  WHATSAPP_LAUNCHER_ACTIVITY,
  WHATSAPP_OVERFLOW_FALLBACK_POINT,
  WHATSAPP_PACKAGE,
  WHATSAPP_REPORT_FALLBACK_POINT,
  WHATSAPP_REPORT_TEXTS
} from './constants.js';

async function elements(controller) {
  return parseUIDump(await controller.getUIDump());
}

// Best-effort popup clearing. Mirrors tiktok/ui-flows: bounded rounds, tap the
// first dismiss-like control found, break as soon as none remain. Never throws.
async function dismissPopups(controller, actor = null, rounds = 3) {
  const activeActor = actor || createHumanActor({ controller });
  for (let index = 0; index < rounds; index += 1) {
    const found = findElement(await elements(controller), ...WHATSAPP_DISMISS_TEXTS);
    if (!found) break;
    await activeActor.tapElement(found, { afterMs: 650 });
  }
}

// Selector-first, else provisional coordinate: try each selector as a
// resource-id, then as substring text; only tap the fallback point when the
// screen exposes neither. The point path is the fragile, verify-by-fact branch.
async function tapSelectorOrPoint(controller, actor, els, selectors, point) {
  const target =
    selectors.map((selector) => findByResourceId(els, selector)).find(Boolean) ||
    findElement(els, ...selectors);
  if (target) return actor.tapElement(target);
  await controller.tap(point.x, point.y);
  await actor.pause();
  return false;
}

export function detectBanScreen(els) {
  const text = getAllText(els).join(' ').toLowerCase();
  return WHATSAPP_BAN_TEXTS.some((phrase) => text.includes(phrase.toLowerCase()));
}

export async function checkWhatsappState(controller) {
  await controller.startApp(WHATSAPP_PACKAGE, WHATSAPP_LAUNCHER_ACTIVITY);
  await dismissPopups(controller);
  const els = await elements(controller);
  const text = getAllText(els).join(' ').toLowerCase();
  if (detectBanScreen(els)) return 'banned';
  const homeHits = WHATSAPP_HOME_TEXTS.filter((label) => text.includes(label.toLowerCase())).length;
  if (homeHits >= 2) return 'logged_in';
  if (!text) return 'unknown';
  return 'logged_out';
}

export async function reportTarget(controller, { targetMsisdn, alsoBlock = false } = {}) {
  const actor = createHumanActor({ controller });
  const digits = String(targetMsisdn).replace(/[^0-9]/g, '');

  // Open the target's chat via a wa.me deep link — robust vs. fragile in-app
  // search, and it works whether or not the number is a saved contact.
  await controller.shell(
    `am start -a android.intent.action.VIEW -d "https://wa.me/${digits}" ${WHATSAPP_PACKAGE}`
  );
  await actor.pause();

  if (detectBanScreen(await elements(controller))) return { ok: false, banned: true };

  // Open the overflow menu (selector-first, provisional point otherwise).
  await tapSelectorOrPoint(
    controller,
    actor,
    await elements(controller),
    ['com.whatsapp:id/menuitem_overflow', 'More options'],
    WHATSAPP_OVERFLOW_FALLBACK_POINT
  );

  // Tap Report — prefer the "Report and block" label when alsoBlock is set.
  const reportSelectors = alsoBlock ? ['Report and block', ...WHATSAPP_REPORT_TEXTS] : WHATSAPP_REPORT_TEXTS;
  await tapSelectorOrPoint(controller, actor, await elements(controller), reportSelectors, WHATSAPP_REPORT_FALLBACK_POINT);

  // A ban can surface mid-flow (opening the chat or the menu can trip it).
  if (detectBanScreen(await elements(controller))) return { ok: false, banned: true };

  return { ok: true };
}

// SESSION-IMPORT SEAM — intentionally unimplemented. Bringing an account online
// requires importing a purchased session onto the device, and the on-device
// import mechanism is coupled to the dark.shopping delivery format (a Plan 3
// concern). Implement this only once the Plan-3 delivery format + a real
// session artifact are known; shipping a guessed importer risks nuking sessions.
export async function bringWhatsappOnline(_controller, { sessionRef: _sessionRef } = {}) {
  throw domainError(
    'WHATSAPP_SESSION_IMPORT_UNVERIFIED',
    'session-import mechanism depends on the dark.shopping delivery format (Plan 3 seam) — implement against a real session artifact first'
  );
}
