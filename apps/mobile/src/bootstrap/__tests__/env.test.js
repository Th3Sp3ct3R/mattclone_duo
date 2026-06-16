import { bootstrapEnv } from '@/bootstrap/env.js';

test('bootstrapEnv initializes process.env', () => {
  const prevProcess = globalThis.process;
  globalThis.process = undefined;

  bootstrapEnv();
  expect(globalThis.process).toBeTruthy();
  expect(globalThis.process.env).toBeTruthy();

  globalThis.process = prevProcess;
});







