const DEFAULT_CONTEXT_LIMITS = {
  maximumDepth: 2,
  maximumKeysPerObject: 12,
  maximumListItems: 6,
  maximumStringLength: 240,
  maximumEventMessageLength: 200
};

const DEFAULT_REDACTED_KEYS = [
  'password',
  'secret',
  'token',
  'api',
  'apikey',
  'authorization',
  'cookie',
  'jwt',
  'session'
];

function normalizeText(value, maximumLength) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (!maximumLength || text.length <= maximumLength) return text;
  return `${text.slice(0, maximumLength - 1)}…`;
}

function shouldRedactKey(rawKey, redactedKeys) {
  const key = String(rawKey || '').toLowerCase();
  return redactedKeys.some((needle) => key.includes(needle));
}

function sanitizeContextValue(value, options, depth) {
  const {
    maximumDepth,
    maximumKeysPerObject,
    maximumListItems,
    maximumStringLength,
    redactedKeys
  } = options;

  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return normalizeText(value, maximumStringLength);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    if (depth >= maximumDepth) return '[list]';
    return value
      .slice(0, maximumListItems)
      .map((entry) => sanitizeContextValue(entry, options, depth + 1))
      .filter((entry) => entry !== null && entry !== undefined);
  }

  if (typeof value === 'object') {
    if (depth >= maximumDepth) return '[object]';
    const entries = Object.entries(value).slice(0, maximumKeysPerObject);
    const sanitized = {};
    for (const [key, entryValue] of entries) {
      if (shouldRedactKey(key, redactedKeys)) {
        sanitized[key] = '[redacted]';
        continue;
      }
      const nextValue = sanitizeContextValue(entryValue, options, depth + 1);
      if (nextValue !== null && nextValue !== undefined) {
        sanitized[key] = nextValue;
      }
    }
    return sanitized;
  }

  return normalizeText(value, maximumStringLength);
}

function formatValue(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'object' ? JSON.stringify(entry) : String(entry)))
      .join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatSection(label, values) {
  if (!values || (Array.isArray(values) && values.length === 0)) return '';
  if (typeof values === 'string') return `${label}: ${values}`;
  if (Array.isArray(values)) {
    return [`${label}:`, ...values.map((entry) => `- ${entry}`)].join('\n');
  }
  const lines = Object.entries(values)
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .filter((line) => line.trim());
  if (!lines.length) return '';
  return [`${label}:`, ...lines.map((line) => `- ${line}`)].join('\n');
}

function normalizeRecentEvents(events, options) {
  const { maximumListItems, maximumEventMessageLength, maximumStringLength } = options;
  if (!Array.isArray(events)) return [];
  return events.slice(0, maximumListItems).map((event) => {
    const title = normalizeText(event?.title, maximumStringLength);
    const message = normalizeText(event?.message, maximumEventMessageLength);
    const level = normalizeText(event?.level, maximumStringLength);
    const timestamp = normalizeText(event?.timestamp, maximumStringLength);
    const parts = [];
    if (level) parts.push(`[${level}]`);
    if (title) parts.push(title);
    if (message) parts.push(message);
    if (timestamp) parts.push(`(${timestamp})`);
    return parts.join(' ');
  });
}

export function buildChatContextMessage(context, options = {}) {
  if (!context || typeof context !== 'object') return null;
  const settings = {
    ...DEFAULT_CONTEXT_LIMITS,
    redactedKeys: options.redactedKeys || DEFAULT_REDACTED_KEYS,
    ...options
  };

  const route = sanitizeContextValue(context.route, settings, 0);
  const user = sanitizeContextValue(context.user, settings, 0);
  const pageData = sanitizeContextValue(context.pageData || context.page, settings, 0);
  const assistant = sanitizeContextValue(
    context.assistant || context.persona || context.identity,
    settings,
    0
  );
  const recentEvents = normalizeRecentEvents(context.recentEvents, settings);

  const responseStyle = normalizeText(
    context.responseStyle ||
      'Respond with short, clear, plain-text answers. Do not include markup or reasoning.',
    settings.maximumStringLength
  );

  const sections = [
    formatSection('Route', route),
    formatSection('User', user),
    formatSection('Assistant', assistant),
    formatSection('Response style', responseStyle),
    formatSection('Page data', pageData),
    formatSection('Recent events', recentEvents)
  ].filter(Boolean);

  if (!sections.length) return null;
  return {
    role: 'system',
    content: ['Context for this session:', ...sections].join('\n')
  };
}

export { DEFAULT_CONTEXT_LIMITS, DEFAULT_REDACTED_KEYS };
