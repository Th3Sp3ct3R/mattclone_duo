const SECRET_KEY_RE = /(password|token|secret|cookie|authorization|api[_-]?key|session|otp|totp|pwd|csrf)/i;
const RAW_CAPTURE_KEY_RE = /(raw[_-]?(xml|screenshot)|ui[_-]?xml|xml[_-]?dump|source[_-]?xml|screenshot[_-]?base64|session[_-]?material)/i;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 500;
const MAX_UI_ELEMENTS = 80;

export function sanitizeCommandData(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_ITEMS).map(sanitizeCommandData);
  if (typeof value === 'string') return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
  if (typeof value !== 'object') return value;

  const clean = {};
  for (const [key, child] of Object.entries(value)) {
    clean[key] =
      SECRET_KEY_RE.test(key) || isPrivateTextKey(key) || RAW_CAPTURE_KEY_RE.test(key)
        ? '[redacted]'
        : sanitizeCommandData(child);
  }
  return clean;
}

function isPrivateTextKey(key = '') {
  const raw = String(key || '');
  const compact = raw.replace(/[_-]/g, '').toLowerCase();
  if (
    [
      'message',
      'messages',
      'text',
      'body',
      'preview',
      'reply',
      'replytext',
      'caption',
      'captiontext',
      'comment',
      'commenttext',
      'incoming',
      'outgoing',
      'lastpermanentitem',
      'threadtitle',
      'sender',
      'recipient'
    ].includes(compact)
  ) {
    return true;
  }
  return /(message|preview|reply|lastpermanentitem|threadtitle|incoming|outgoing)/i.test(compact);
}

export function normalizeCoordinate({ x, y, width = 720, height = 1280 } = {}) {
  const safeWidth = Math.max(1, Number(width || 720));
  const safeHeight = Math.max(1, Number(height || 1280));
  const safeX = Math.max(0, Math.round(Number(x || 0)));
  const safeY = Math.max(0, Math.round(Number(y || 0)));
  return {
    x: safeX,
    y: safeY,
    width: safeWidth,
    height: safeHeight,
    nx: Number((safeX / safeWidth).toFixed(6)),
    ny: Number((safeY / safeHeight).toFixed(6))
  };
}

function decodeXmlValue(value = '') {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseNodeAttributes(raw = '') {
  const attrs = {};
  const re = /([\w:-]+)="([^"]*)"/g;
  let match;
  while ((match = re.exec(raw))) {
    attrs[match[1]] = decodeXmlValue(match[2]);
  }
  return attrs;
}

function parseBounds(bounds = '') {
  const match = String(bounds || '').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const x1 = Number(match[1]);
  const y1 = Number(match[2]);
  const x2 = Number(match[3]);
  const y2 = Number(match[4]);
  if (![x1, y1, x2, y2].every(Number.isFinite)) return null;
  return {
    x1,
    y1,
    x2,
    y2,
    width: Math.max(0, x2 - x1),
    height: Math.max(0, y2 - y1),
    center: {
      x: Math.round((x1 + x2) / 2),
      y: Math.round((y1 + y2) / 2)
    }
  };
}

export function parseUiDumpNodes(xml = '') {
  const text = String(xml || '');
  const nodes = [];
  const re = /<node\b([^>]*)\/?>/g;
  let match;
  while ((match = re.exec(text)) && nodes.length < 500) {
    const attrs = parseNodeAttributes(match[1]);
    const bounds = parseBounds(attrs.bounds);
    nodes.push({
      text: attrs.text || '',
      contentDesc: attrs['content-desc'] || '',
      resourceId: attrs['resource-id'] || '',
      className: attrs.class || '',
      clickable: attrs.clickable === 'true',
      enabled: attrs.enabled !== 'false',
      focused: attrs.focused === 'true',
      selected: attrs.selected === 'true',
      password: attrs.password === 'true',
      bounds
    });
  }
  return nodes;
}

function safeUiElement(node = {}, category = 'unknown') {
  const label = `${node.text || ''} ${node.contentDesc || ''}`.trim();
  return {
    category,
    className: node.className || '',
    resourceIdHint: node.resourceId ? node.resourceId.split('/').pop() || '' : '',
    clickable: Boolean(node.clickable),
    enabled: Boolean(node.enabled),
    focused: Boolean(node.focused),
    selected: Boolean(node.selected),
    textLength: node.text ? node.text.length : 0,
    descriptionLength: node.contentDesc ? node.contentDesc.length : 0,
    hasPrivateLabel: Boolean(label),
    bounds: node.bounds
      ? {
          x1: node.bounds.x1,
          y1: node.bounds.y1,
          x2: node.bounds.x2,
          y2: node.bounds.y2,
          center: node.bounds.center
        }
      : null
  };
}

export function classifyInstagramUiLabel(label = '') {
  const value = String(label || '').trim().toLowerCase();
  if (!value) return '';
  if (value === 'back' || value.includes('go back')) return 'back_button';
  if (value.includes('search')) return 'search_field';
  if (value.includes('new message') || value.includes('compose')) return 'compose_button';
  if (value === 'primary') return 'primary_tab';
  if (value === 'general') return 'general_tab';
  if (value === 'requests' || value.includes('message request')) return 'requests_tab';
  if (value === 'all' || value === 'unread') return 'filter_tab';
  if (value.includes('options') || value.includes('more')) return 'options_button';
  if (value.includes('send')) return 'send_button';
  if (value.includes('message...') || value === 'message' || value.includes('write a message')) return 'message_composer';
  if (value.includes('camera')) return 'camera_button';
  if (value.includes('photo') || value.includes('gallery')) return 'gallery_button';
  if (value.includes('voice') || value.includes('microphone')) return 'voice_button';
  if (value.includes('like')) return 'like_button';
  if (value.includes('details') || value === 'info') return 'info_button';
  if (value.includes('video')) return 'video_call_button';
  if (value.includes('call')) return 'call_button';
  if (value.includes('active now') || value.includes('sent') || value.includes('seen') || value.includes('now')) return 'thread_row';
  return '';
}

function summarizePrivateUi(xml = '', { mode = 'direct_inbox' } = {}) {
  const nodes = parseUiDumpNodes(xml);
  const elements = [];
  const seen = new Set();
  let privateLabelNodeCount = 0;

  for (const node of nodes) {
    const label = `${node.text || ''} ${node.contentDesc || ''}`.trim();
    if (label) privateLabelNodeCount += 1;
    const explicitCategory = classifyInstagramUiLabel(label);
    let category = explicitCategory;

    if (!category && node.bounds) {
      const { y1, y2, height, width } = node.bounds;
      if (mode === 'direct_inbox') {
        if (y1 > 980 && height >= 80 && width > 400) category = 'thread_row';
        else if (y1 > 560 && y2 < 920 && height >= 80) category = 'notes_tray_item';
      } else if (mode === 'direct_thread') {
        if (y1 > 1550 && height >= 60) category = 'composer_area';
        else if (height >= 36 && width > 120 && y1 > 240 && y2 < 1550) category = 'message_bubble';
      }
    }

    if (!category) continue;
    const center = node.bounds?.center;
    const key = `${category}:${center?.x || 0}:${center?.y || 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    elements.push(safeUiElement(node, category));
    if (elements.length >= MAX_UI_ELEMENTS) break;
  }

  const counts = elements.reduce((acc, element) => {
    acc[element.category] = (acc[element.category] || 0) + 1;
    return acc;
  }, {});

  return {
    bytes: Buffer.byteLength(String(xml || ''), 'utf8'),
    nodeCount: nodes.length,
    privateLabelNodeCount,
    categories: counts,
    elements
  };
}

export function summarizeDirectInboxUi(xml = '') {
  return summarizePrivateUi(xml, { mode: 'direct_inbox' });
}

export function summarizeDirectThreadUi(xml = '') {
  return summarizePrivateUi(xml, { mode: 'direct_thread' });
}

export function summarizeUiDump(xml = '', { includeTextHints = true } = {}) {
  const text = String(xml || '');
  const nodeCount = (text.match(/<node\b/g) || []).length;
  const textHints = [];
  if (includeTextHints) {
    const re = /\b(?:text|content-desc)="([^"]{1,80})"/g;
    let match;
    while ((match = re.exec(text)) && textHints.length < 20) {
      const hint = decodeXmlValue(match[1]).trim();
      if (hint && !SECRET_KEY_RE.test(hint) && !textHints.includes(hint)) textHints.push(hint);
    }
  }
  return {
    bytes: Buffer.byteLength(text, 'utf8'),
    nodeCount,
    textHints
  };
}

export function detectInstagramScreen({ packageName = '', uiSummary = {} } = {}) {
  if (packageName && packageName !== 'com.instagram.android') return 'other_app';
  const hints = (uiSummary.textHints || []).map((hint) => String(hint).toLowerCase());
  if (hints.some((hint) => hint.includes('log in') || hint.includes('login'))) return 'login';
  if (hints.some((hint) => hint.includes('challenge') || hint.includes('suspicious'))) return 'checkpoint';
  if (hints.some((hint) => hint === 'follow' || hint.includes('message'))) return 'profile';
  if (hints.some((hint) => hint.includes('search'))) return 'search';
  if (packageName === 'com.instagram.android') return 'instagram_unknown';
  return 'unknown';
}

export function safeUsername(value = '') {
  const username = String(value || '').trim().replace(/^@/, '');
  if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) {
    const err = new Error('targetUsername must be a valid Instagram username');
    err.status = 400;
    err.payload = { code: 'BAD_REQUEST', message: err.message };
    throw err;
  }
  return username;
}

export function safeHashtag(value = '') {
  const hashtag = String(value || '').trim().replace(/^#/, '');
  if (!/^[A-Za-z0-9_]{1,120}$/.test(hashtag)) {
    const err = new Error('hashtag must contain only letters, numbers, or underscores with no leading slash');
    err.status = 400;
    err.payload = { code: 'BAD_REQUEST', message: err.message };
    throw err;
  }
  return hashtag;
}
