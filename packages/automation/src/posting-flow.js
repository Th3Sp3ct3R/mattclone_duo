import { delay } from '@julio/device-control';

import { humanDelayMs, jitterPoint } from './humanize.js';

export class AutomationFlow {
  constructor({ controller, personality = {} } = {}) {
    if (!controller) throw new Error('Automation controller is required');
    this.controller = controller;
    this.personality = personality;
  }

  async pause(options = {}) {
    const ms = humanDelayMs({
      ...options,
      meanMs: Number(options.meanMs || 750) * Number(this.personality.delayMultiplier || 1)
    });
    await delay(ms);
    return ms;
  }

  async tap(target) {
    const point = jitterPoint({
      x: target?.x,
      y: target?.y,
      radius: target?.radius ?? this.personality.tapRadius ?? 6
    });
    await this.pause({ meanMs: target?.delayBeforeMs || 400 });
    return this.controller.tap(point.x, point.y);
  }

  async inputText(text) {
    await this.pause({ meanMs: 500 });
    return this.controller.inputText(text);
  }
}

export class PlatformPostingFlow extends AutomationFlow {
  async publishPost() {
    throw new Error('publishPost must be implemented by a platform-specific flow');
  }
}
