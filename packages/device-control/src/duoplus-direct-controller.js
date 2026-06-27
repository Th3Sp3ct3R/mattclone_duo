import { DeviceControlError } from './errors.js';
import { delay } from './timing.js';

function commandPayload(response = {}, imageId = '') {
  const data = response.data || {};
  if (data[imageId]) return data[imageId];
  return data;
}

function assertCommandOk(result = {}, command = '') {
  if (result.success === false) {
    throw new DeviceControlError('DuoPlus command failed', {
      code: 'DUOPLUS_COMMAND_FAILED',
      details: { command, message: result.message || '' }
    });
  }
  return String(result.content || '').trim();
}

export class DuoplusDirectController {
  constructor({ client, imageId, shellTimeoutMs = 10_000, pollIntervalMs = 750 } = {}) {
    if (!client) throw new DeviceControlError('DuoPlus client is required', { code: 'DUOPLUS_DIRECT_CONFIG' });
    if (!imageId) throw new DeviceControlError('DuoPlus imageId is required', { code: 'DUOPLUS_DIRECT_CONFIG' });
    this.client = client;
    this.imageId = imageId;
    this.shellTimeoutMs = shellTimeoutMs;
    this.pollIntervalMs = pollIntervalMs;
  }

  connect() {
    return Promise.resolve(true);
  }

  disconnect() {
    return Promise.resolve();
  }

  waitForDevice() {
    return Promise.resolve(true);
  }

  async shell(command) {
    const response = await this.client.executeCommand(this.imageId, command);
    return assertCommandOk(commandPayload(response, this.imageId), command);
  }

  tap(x, y) {
    return this.shell(`input tap ${Math.round(x)} ${Math.round(y)}`);
  }

  swipe(startX, startY, endX, endY, durationMs = 350) {
    return this.shell(
      `input swipe ${Math.round(startX)} ${Math.round(startY)} ${Math.round(endX)} ${Math.round(endY)} ${Math.round(
        durationMs
      )}`
    );
  }

  inputText(text) {
    return this.shell(`input text ${String(text || '').replace(/\s/g, '%s')}`);
  }

  type(text) {
    return this.inputText(text);
  }

  keyevent(keyCode) {
    return this.shell(`input keyevent ${Number(keyCode)}`);
  }

  keyEvent(keyCode) {
    return this.keyevent(keyCode);
  }

  enter() {
    return this.keyevent(66);
  }

  async getUIDump() {
    await this.shell('DuoPlusDumpUI /sdcard/uidump.xml').catch(() => '');
    await delay(this.pollIntervalMs);
    return this.shell('cat /sdcard/uidump.xml').catch(() => '');
  }

  async getCurrentPackage() {
    const output = await this.shell('dumpsys window 2>/dev/null | grep mCurrentFocus').catch(() => '');
    return output.match(/\s([a-z0-9._]+)\/[a-zA-Z0-9._]+/i)?.[1] || '';
  }

  async screenshot() {
    const content = await this.shell('screencap -p | base64').catch(() => '');
    const base64 = String(content || '').replace(/\s+/g, '');
    return base64 ? `data:image/png;base64,${base64}` : '';
  }
}
