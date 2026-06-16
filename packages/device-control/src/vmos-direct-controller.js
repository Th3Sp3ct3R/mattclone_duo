import { DeviceControlError } from './errors.js';
import { delay } from './timing.js';

function shellEscape(value) {
  return String(value || '').replace(/'/g, "'\\''");
}

function ok(response) {
  return response?.code === 0 || response?.code === 200 || response?.code === undefined;
}

export class VmosDirectController {
  constructor({ client, padCode, shellTimeoutMs = 20_000, pollIntervalMs = 1_000 } = {}) {
    if (!client) throw new DeviceControlError('VMOS client is required', { code: 'VMOS_DIRECT_CONFIG' });
    if (!padCode) throw new DeviceControlError('VMOS padCode is required', { code: 'VMOS_DIRECT_CONFIG' });
    this.client = client;
    this.padCode = padCode;
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
    const response = await this.client.execAdbCommand([this.padCode], command);
    if (!ok(response)) {
      throw new DeviceControlError('VMOS async command failed', {
        code: 'VMOS_ASYNC_COMMAND_FAILED',
        details: response
      });
    }
    const task = (response.data || []).find((entry) => entry.padCode === this.padCode) || response.data?.[0];
    if (!task?.taskId) {
      throw new DeviceControlError('VMOS async command did not return a task id', {
        code: 'VMOS_TASK_MISSING',
        details: response
      });
    }

    const deadline = Date.now() + this.shellTimeoutMs;
    while (Date.now() < deadline) {
      await delay(this.pollIntervalMs);
      const resultResponse = await this.client.getScriptResult([task.taskId]);
      const result = (resultResponse.data || []).find((entry) => entry.taskId === task.taskId);
      if (!result) continue;
      if (result.taskStatus === 3) return String(result.taskResult || '').trim();
      if (result.taskStatus === -1) {
        throw new DeviceControlError('VMOS shell command failed', {
          code: 'VMOS_SHELL_FAILED',
          details: { command, result }
        });
      }
    }

    throw new DeviceControlError('VMOS shell command timed out', {
      code: 'VMOS_SHELL_TIMEOUT',
      details: { command, timeoutMs: this.shellTimeoutMs }
    });
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

  longPress(x, y, durationMs = 800) {
    return this.swipe(x, y, x, y, durationMs);
  }

  async inputText(text) {
    const response = await this.client.inputText([this.padCode], String(text || ''));
    if (!ok(response)) {
      throw new DeviceControlError('VMOS inputText failed', {
        code: 'VMOS_INPUT_TEXT_FAILED',
        details: response
      });
    }
    return response;
  }

  type(text) {
    return this.inputText(text);
  }

  typeHuman(text) {
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

  clearField(times = 30) {
    return this.shell(Array.from({ length: times }, () => 'input keyevent 67').join('; '));
  }

  startApp(packageName, activity = '') {
    if (activity) {
      const component = activity.includes('/') ? activity : `${packageName}/${activity}`;
      return this.shell(`am start -W -n ${component}`);
    }
    return this.client.startApp([this.padCode], packageName);
  }

  stopApp(packageName) {
    return this.client.stopApp([this.padCode], packageName);
  }

  cleanAppHome(packageName) {
    return this.shell(`pm clear ${shellEscape(packageName)}`);
  }

  async getUIDump() {
    let size = 0;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await this.shell('uiautomator dump /sdcard/_julio_ui.xml 2>/dev/null').catch(() => '');
      const sizeText = await this.shell('wc -c < /sdcard/_julio_ui.xml').catch(() => '0');
      size = Number.parseInt(String(sizeText).trim(), 10);
      if (Number.isFinite(size) && size > 0) break;
      await delay(1_200);
    }
    if (!Number.isFinite(size) || size <= 0) return '';

    const chunkSize = 1_800;
    const chunks = [];
    for (let offset = 0; offset < size; offset += chunkSize) {
      const skip = Math.floor(offset / chunkSize);
      chunks.push(await this.shell(`dd if=/sdcard/_julio_ui.xml bs=${chunkSize} skip=${skip} count=1 2>/dev/null`));
    }
    return chunks.join('');
  }

  async getCurrentPackage() {
    const output = await this.shell('dumpsys window 2>/dev/null | grep mCurrentFocus').catch(() => '');
    return output.match(/\s([a-z0-9._]+)\/[a-zA-Z0-9._]+/i)?.[1] || '';
  }

  async screenshot() {
    const response = await this.client.getPreviewImage([this.padCode]);
    const data = response.data;
    if (Array.isArray(data)) return data[0]?.url || '';
    return data?.url || '';
  }

  pushFile() {
    throw new DeviceControlError('pushFile is unavailable on VMOS direct controller; use uploadFileV3', {
      code: 'VMOS_DIRECT_PUSH_UNAVAILABLE'
    });
  }
}
