import {
  detectInstagramScreen,
  normalizeCoordinate,
  safeHashtag,
  summarizeDirectInboxUi,
  summarizeDirectThreadUi,
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

test('sanitizeCommandData redacts private DM-shaped text fields recursively', () => {
  expect(
    sanitizeCommandData({
      message: 'hello private thread',
      replyText: 'reply body',
      nested: {
        last_permanent_item: { text: 'preview text' },
        uiXml: '<hierarchy><node text="private" /></hierarchy>'
      },
      kept: 'safe'
    })
  ).toEqual({
    message: '[redacted]',
    replyText: '[redacted]',
    nested: {
      last_permanent_item: '[redacted]',
      uiXml: '[redacted]'
    },
    kept: 'safe'
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

test('summarizeDirectInboxUi returns categories without leaking usernames or previews', () => {
  const summary = summarizeDirectInboxUi(`
    <hierarchy>
      <node text="Search" class="android.widget.EditText" bounds="[84,288][996,408]" clickable="true" />
      <node text="@private_user" class="android.widget.TextView" bounds="[156,1080][732,1140]" />
      <node text="meet me at 7" class="android.widget.TextView" bounds="[156,1140][852,1200]" />
      <node text="Requests" class="android.widget.TextView" bounds="[852,920][1056,1036]" clickable="true" />
    </hierarchy>
  `);
  expect(summary.categories.search_field).toBe(1);
  expect(summary.categories.requests_tab).toBe(1);
  expect(JSON.stringify(summary)).not.toContain('@private_user');
  expect(JSON.stringify(summary)).not.toContain('meet me at 7');
});

test('summarizeDirectThreadUi returns composer and message categories without leaking thread text', () => {
  const summary = summarizeDirectThreadUi(`
    <hierarchy>
      <node text="Back" class="android.widget.ImageView" bounds="[36,96][132,204]" clickable="true" />
      <node text="secret incoming text" class="android.widget.TextView" bounds="[96,640][780,732]" />
      <node text="Message..." class="android.widget.EditText" bounds="[132,1660][840,1840]" clickable="true" />
      <node content-desc="Send" class="android.widget.Button" bounds="[888,1660][1044,1840]" clickable="true" />
    </hierarchy>
  `);
  expect(summary.categories.back_button).toBe(1);
  expect(summary.categories.message_composer).toBe(1);
  expect(summary.categories.send_button).toBe(1);
  expect(JSON.stringify(summary)).not.toContain('secret incoming text');
});

test('detectInstagramScreen classifies common Instagram states', () => {
  expect(detectInstagramScreen({ packageName: 'com.instagram.android', uiSummary: { textHints: ['Follow'] } })).toBe('profile');
  expect(detectInstagramScreen({ packageName: 'com.instagram.android', uiSummary: { textHints: ['Log in'] } })).toBe('login');
  expect(detectInstagramScreen({ packageName: 'com.other', uiSummary: { textHints: [] } })).toBe('other_app');
});

test('safeHashtag normalizes hash input and rejects browser-style slash paths', () => {
  expect(safeHashtag('#osagent')).toBe('osagent');
  expect(() => safeHashtag('/explore/tags/osagent')).toThrow('hashtag must contain');
});
