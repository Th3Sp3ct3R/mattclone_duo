import { normalizeHttpError, resolveApiBaseUrl } from '../index.js';

test('resolveApiBaseUrl returns /api in browser-like env', () => {
  const prevWindow = global.window;
  global.window = {};
  expect(resolveApiBaseUrl()).toBe('/api');
  global.window = prevWindow;
});

test('normalizeHttpError returns stable shape', () => {
  const err = new Error('Boom');
  const norm = normalizeHttpError(err);
  expect(norm.ok).toBe(false);
  expect(norm.message).toBe('Boom');
  expect(norm.status).toBe(null);
});







