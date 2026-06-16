import {
  findDismissButton,
  findElement,
  findElementExact,
  getAllText,
  parseUIDump,
  delay
} from '@julio/device-control';

import { TIKTOK_DISMISS_TEXTS, TIKTOK_LAUNCHER_ACTIVITY, TIKTOK_PACKAGE } from './constants.js';

const HOME_TEXTS = ['For You', 'Following'];
const LOGIN_TEXTS = ['Log in', 'Sign up', 'Use phone', 'email', 'username'];
const CHALLENGE_TEXTS = ['verification code', 'enter the code', 'captcha', 'suspended', 'banned'];

async function elements(controller) {
  return parseUIDump(await controller.getUIDump());
}

async function tapIfVisible(controller, options) {
  const found = findElement(await elements(controller), ...options);
  if (!found) return false;
  await controller.tap(found.x, found.y);
  await delay(1_000);
  return true;
}

async function dismissPopups(controller, rounds = 3) {
  for (let index = 0; index < rounds; index += 1) {
    const found = findDismissButton(await elements(controller), TIKTOK_DISMISS_TEXTS);
    if (!found) break;
    await controller.tap(found.x, found.y);
    await delay(800);
  }
}

export async function checkTikTokLoginState(controller) {
  await controller.startApp(TIKTOK_PACKAGE, TIKTOK_LAUNCHER_ACTIVITY).catch(() => {});
  await delay(3_000);
  await dismissPopups(controller);
  const text = getAllText(await elements(controller)).join(' ').toLowerCase();
  const hasHome = HOME_TEXTS.some((item) => text.includes(item.toLowerCase()));
  const hasLogin = LOGIN_TEXTS.some((item) => text.includes(item.toLowerCase()));
  if (hasHome && !hasLogin) return 'logged_in';
  if (hasLogin) return 'logged_out';
  return 'unknown';
}

async function typeIntoFirstEditText(controller, value) {
  const editText = (await elements(controller)).find((item) => /edittext|editabletext/i.test(item.className || ''));
  if (editText) await controller.tap(editText.x, editText.y);
  await controller.inputText(value);
  await delay(800);
}

export async function loginTikTok(controller, { username = '', password = '', emailCodeFetcher = null } = {}) {
  if (!username || !password) throw new Error('TikTok credentials are required');
  await controller.cleanAppHome(TIKTOK_PACKAGE).catch(() => {});
  await controller.startApp(TIKTOK_PACKAGE, TIKTOK_LAUNCHER_ACTIVITY);
  await delay(4_000);
  await dismissPopups(controller, 5);

  await tapIfVisible(controller, ['Profile', 'Me']);
  await tapIfVisible(controller, ['Log in', 'Already have an account']);
  await tapIfVisible(controller, ['Use phone', 'email', 'username']);
  await tapIfVisible(controller, ['Email / Username', 'Username', 'Email']);

  await typeIntoFirstEditText(controller, username);
  await tapIfVisible(controller, ['Continue', 'Next']);
  await typeIntoFirstEditText(controller, password);
  await tapIfVisible(controller, ['Log in', 'Login', 'Continue']);
  await delay(5_000);

  let visibleText = getAllText(await elements(controller)).join(' ').toLowerCase();
  if (visibleText.includes('verification code') || visibleText.includes('enter the code')) {
    if (!emailCodeFetcher) return { success: false, status: 'verification_needed', reason: 'email_code_required' };
    const code = await emailCodeFetcher.fetchLatestCode();
    if (!code) return { success: false, status: 'verification_needed', reason: 'email_code_not_found' };
    await typeIntoFirstEditText(controller, code);
    await tapIfVisible(controller, ['Continue', 'Verify', 'Submit']);
    await delay(5_000);
  }

  visibleText = getAllText(await elements(controller)).join(' ').toLowerCase();
  if (CHALLENGE_TEXTS.some((item) => visibleText.includes(item))) {
    return { success: false, status: visibleText.includes('captcha') ? 'captcha' : 'checkpointed', reason: visibleText };
  }

  const state = await checkTikTokLoginState(controller);
  return {
    success: state === 'logged_in',
    status: state === 'logged_in' ? 'active' : 'checkpointed',
    reason: state
  };
}

export async function setupTikTokProfile(controller, { displayName = '', bio = '' } = {}) {
  await controller.startApp(TIKTOK_PACKAGE, TIKTOK_LAUNCHER_ACTIVITY);
  await delay(3_000);
  await dismissPopups(controller);
  await tapIfVisible(controller, ['Profile', 'Me']);
  await tapIfVisible(controller, ['Edit profile']);

  if (displayName) {
    await tapIfVisible(controller, ['Name']);
    await controller.clearField(40);
    await controller.inputText(displayName);
    await tapIfVisible(controller, ['Save']);
  }

  if (bio) {
    await tapIfVisible(controller, ['Bio']);
    await controller.clearField(120);
    await controller.inputText(bio);
    await tapIfVisible(controller, ['Save']);
  }

  const text = getAllText(await elements(controller)).join(' ');
  const saved = displayName ? text.includes(displayName) : true;
  return { success: saved, status: saved ? 'active' : 'checkpointed' };
}

export { findElement, findElementExact };
