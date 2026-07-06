import {
  detectInstagramScreen,
  normalizeCoordinate,
  sanitizeCommandData,
  summarizeUiDump
} from './device-command-safety.js';

test('sanitizeCommandData redacts secret-shaped keys recursively', () => {
  expect(
    sanitizeCommandData({
      ok: true,
      Authorization: 'Bearer raw',
      nested: { sessionid: 'abc', value: 'kept' },
      arr: [{ apiKey: 'secret' }]
    })
  ).toEqual({
    ok: true,
    Authorization: '[redacted]',
    nested: { sessionid: '[redacted]', value: 'kept' },
    arr: [{ apiKey: '[redacted]' }]
  });
});

test('normalizeCoordinate stores absolute and normalized coordinate shape', () => {
  expect(normalizeCoordinate({ x: 360, y: 640, width: 720, height: 1280 })).toEqual({
    x: 360,
    y: 640,
    width: 720,
    height: 1280,
    nx: 0.5,
    ny: 0.5
  });
});

test('summarizeUiDump returns bounded safe text hints', () => {
  const summary = summarizeUiDump('<node text="Search" /><node content-desc="Follow" /><node text="sessionid" />');
  expect(summary.nodeCount).toBe(3);
  expect(summary.textHints).toEqual(['Search', 'Follow']);
});

test('detectInstagramScreen classifies common Instagram states', () => {
  expect(detectInstagramScreen({ packageName: 'com.instagram.android', uiSummary: { textHints: ['Follow'] } })).toBe('profile');
  expect(detectInstagramScreen({ packageName: 'com.instagram.android', uiSummary: { textHints: ['Log in'] } })).toBe('login');
  expect(detectInstagramScreen({ packageName: 'com.other', uiSummary: { textHints: [] } })).toBe('other_app');
});
