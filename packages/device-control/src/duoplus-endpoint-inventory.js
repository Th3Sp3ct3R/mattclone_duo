const BILLABLE_ENDPOINTS = new Set([
  '/image/start',
  '/api/v1/cloudPhone/powerOn',
  '/api/v1/cloudPhone/purchase',
  '/api/v1/cloudPhone/renewal',
  '/api/v1/cloudNumber/purchase',
  '/api/v1/cloudNumber/renewal',
  '/api/v1/subscriptionStartup/purchase',
  '/api/v1/subscriptionStartup/renewal'
]);

const STATE_CHANGING_ENDPOINTS = new Set([
  '/account/login',
  '/image/batchHeartbeat',
  '/image/connect',
  '/image/connectTokenShared',
  '/image/heartbeat',
  '/api/v1/cloudPhone/powerOff',
  '/api/v1/cloudPhone/restart',
  '/api/v1/cloudPhone/initProxy',
  '/api/v1/cloudPhone/command',
  '/api/v1/cloudPhone/newPhone',
  '/api/v1/cloudPhone/batchRoot',
  '/api/v1/cloudPhone/openAdb',
  '/api/v1/cloudPhone/closeAdb',
  '/api/v1/cloudPhone/addToGroup',
  '/api/v1/cloudPhone/moveToGroup',
  '/api/v1/cloudPhone/createGroup',
  '/api/v1/cloudPhone/updateGroup',
  '/api/v1/cloudPhone/deleteGroup',
  '/api/v1/cloudPhone/scan',
  '/api/v1/cloudPhone/updateSharePassword',
  '/api/v1/app/install',
  '/api/v1/app/uninstall',
  '/api/v1/app/start',
  '/api/v1/app/stop',
  '/api/v1/proxy/add',
  '/api/v1/proxy/delete',
  '/api/v1/proxy/refresh',
  '/api/v1/proxy/update',
  '/api/v1/cloudDisk/pushFiles',
  '/api/v1/cloudDisk/signedUrl',
  '/api/v1/cloudDisk/delFiles',
  '/api/v1/automation/addPlan',
  '/api/v1/automation/savePlan',
  '/api/v1/automation/setPlanStatus',
  '/api/v1/automation/deletePlan',
  '/api/v1/cloudNumber/imageWriteSms'
]);

const READ_ONLY_ENDPOINTS = new Set([
  '/account/passwordErrorCount',
  '/account/profile',
  '/account/cloudPhone',
  '/account/checkUserStatus',
  '/image/controlList',
  '/image/list',
  '/image/batchCapture2',
  '/image/groupList',
  '/image/windowSetting',
  '/image/supplierRegionList',
  '/image/startCheck',
  '/api/v1/cloudPhone/list',
  '/api/v1/cloudPhone/status',
  '/api/v1/cloudPhone/info',
  '/api/v1/cloudPhone/groupList',
  '/api/v1/cloudPhone/resolutionList',
  '/api/v1/cloudPhone/tagList',
  '/api/v1/cloudPhone/linkUserList',
  '/api/v1/app/list',
  '/api/v1/app/teamList',
  '/api/v1/app/installedList',
  '/api/v1/proxy/list',
  '/api/v1/proxy/check',
  '/api/v1/cloudDisk/list',
  '/api/v1/mobile/timezoneList',
  '/api/v1/mobile/languageList',
  '/api/v1/mobile/modelList',
  '/api/v1/automation/planList',
  '/api/v1/team/order',
  '/api/v1/cloudNumber/numberList',
  '/api/v1/subscriptionStartup/list'
]);

const AUTH_FAILURE_CODES = new Set([401, 403]);
const CLASSIFICATIONS = new Set([
  'live verified',
  'authentication failed',
  'unavailable',
  'state-changing',
  'billable',
  'untested'
]);

export function normalizeEndpointPath(value) {
  try {
    const parsed = new URL(String(value), 'https://api.duoplus.cn');
    const pathname = parsed.pathname
      .split('/')
      .map((segment) => sanitizePathSegment(segment))
      .join('/')
      .replace(/\/{2,}/g, '/')
      .replace(/\/$/, '');
    return pathname || '/';
  } catch {
    return '/';
  }
}

function sanitizePathSegment(rawValue) {
  if (!rawValue) return '';
  let value;
  try {
    value = decodeURIComponent(rawValue);
  } catch {
    return ':value';
  }
  if (/^v\d+$/i.test(value)) return value;
  if (/^[A-Z][A-Za-z0-9_-]{3,}$/.test(value)) return ':id';
  if (/^\+?\d{5,}$/.test(value)) return ':id';
  if (/^[0-9a-f]{12,}$/i.test(value)) return ':id';
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value)) return ':id';
  if (value.length >= 16 && /[A-Za-z]/.test(value) && /\d/.test(value)) return ':id';
  if (/[@\s]/.test(value)) return ':value';
  return value;
}

function safeFieldSegment(value) {
  const segment = String(value || '').trim();
  if (!segment || segment.length > 64) return '[dynamic]';
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(segment)) return '[dynamic]';
  if (/^[A-Z][A-Za-z0-9_-]{3,12}$/.test(segment) && /[a-z]/.test(segment)) return '[dynamic]';
  return segment;
}

function parsePossibleJson(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function extractFieldNames(value, { maxDepth = 8 } = {}) {
  const fields = new Set();
  const root = parsePossibleJson(value);

  function visit(current, prefix, depth) {
    if (depth > maxDepth || current === null || current === undefined) return;
    if (Array.isArray(current)) {
      for (const item of current.slice(0, 20)) visit(item, prefix, depth + 1);
      return;
    }
    if (typeof current !== 'object') return;
    for (const [rawKey, child] of Object.entries(current)) {
      const key = safeFieldSegment(rawKey);
      const field = prefix ? `${prefix}.${key}` : key;
      fields.add(field);
      visit(child, field, depth + 1);
    }
  }

  visit(root, '', 0);
  return [...fields].sort();
}

export function requestFieldNamesFromCdpRequest(request = {}) {
  const fields = new Set(extractFieldNames(request.postData));
  try {
    const url = new URL(String(request.url));
    for (const key of url.searchParams.keys()) fields.add(`query.${safeFieldSegment(key)}`);
  } catch {
    // No query metadata is available for malformed URLs.
  }
  return [...fields].sort();
}

export function endpointSafety(path) {
  const normalized = normalizeEndpointPath(path);
  if (BILLABLE_ENDPOINTS.has(normalized)) return 'billable';
  if (STATE_CHANGING_ENDPOINTS.has(normalized)) return 'state-changing';
  if (READ_ONLY_ENDPOINTS.has(normalized)) return 'read-only';
  return 'unknown';
}

export function isReadOnlyEndpoint(path) {
  return endpointSafety(path) === 'read-only';
}

export function classifyLiveResult({ status = 0, code, message = '' } = {}) {
  const numericStatus = Number(status || 0);
  const numericCode = Number(code);
  const normalizedMessage = String(message || '').toLowerCase();
  if (
    AUTH_FAILURE_CODES.has(numericStatus) ||
    AUTH_FAILURE_CODES.has(numericCode) ||
    normalizedMessage.includes('login') ||
    normalizedMessage.includes('expired') ||
    normalizedMessage.includes('unauthorized')
  ) {
    return 'authentication failed';
  }
  if (numericStatus >= 200 && numericStatus < 300 && (!Number.isFinite(numericCode) || numericCode === 200)) {
    return 'live verified';
  }
  if (numericStatus === 0 || numericStatus === 404 || numericStatus === 405 || numericStatus >= 500) {
    return 'unavailable';
  }
  return 'untested';
}

export function endpointClassification(path, verification = 'untested') {
  const safety = endpointSafety(path);
  if (safety === 'billable' || safety === 'state-changing') return safety;
  return CLASSIFICATIONS.has(verification) ? verification : 'untested';
}

export function extractStaticEndpoints(sourceTexts = []) {
  const endpoints = new Set();
  const requestPattern = /(?:this\.)?request\(\s*['"`]([^'"`]+)['"`]/g;
  for (const source of sourceTexts) {
    for (const match of String(source || '').matchAll(requestPattern)) {
      endpoints.add(normalizeEndpointPath(match[1]));
    }
  }
  return [...endpoints].sort();
}

function mergeArray(target, values = []) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') target.add(value);
  }
}

function normalizeSessionSource(value) {
  const source = String(value || '');
  if (/^chrome-cdp:\d{2,5}$/.test(source)) return source;
  if (source === 'openapi-key-env' || source === 'local-session-file') return source;
  return 'unknown';
}

function normalizeTimestamp(value) {
  const timestamp = Date.parse(String(value || ''));
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '';
}

export function buildEndpointInventory({ staticEndpoints = [], observations = [], liveResults = [] } = {}) {
  const inventory = new Map();
  const policyBlockedPaths = new Set(
    observations
      .filter((observation) => observation.blocked_by_policy)
      .map((observation) => normalizeEndpointPath(observation.path))
  );

  function ensure(method, path) {
    const normalizedMethod = String(method || 'POST').toUpperCase();
    const normalizedPath = normalizeEndpointPath(path);
    const key = `${normalizedMethod} ${normalizedPath}`;
    if (!inventory.has(key)) {
      inventory.set(key, {
        method: normalizedMethod,
        path: normalizedPath,
        in_static_clients: false,
        response_statuses: new Set(),
        request_field_names: new Set(),
        response_field_names: new Set(),
        session_sources: new Set(),
        observed_at: new Set(),
        blocked_by_policy: false,
        verification: 'untested'
      });
    }
    return inventory.get(key);
  }

  for (const path of staticEndpoints) ensure('POST', path).in_static_clients = true;

  for (const observation of observations) {
    const entry = ensure(observation.method, observation.path);
    if (observation.blocked_by_policy) entry.blocked_by_policy = true;
    mergeArray(entry.response_statuses, [Number(observation.status || 0)].filter(Boolean));
    mergeArray(entry.request_field_names, observation.request_field_names);
    mergeArray(entry.response_field_names, observation.response_field_names);
    mergeArray(entry.session_sources, [normalizeSessionSource(observation.session_source)]);
    mergeArray(entry.observed_at, [normalizeTimestamp(observation.timestamp)]);
    const result = observation.blocked_by_policy
      ? 'untested'
      : observation.authenticated
        ? classifyLiveResult({ status: observation.status })
        : 'untested';
    if (result === 'live verified' || entry.verification === 'untested') entry.verification = result;
  }

  for (const result of liveResults) {
    const entry = ensure(result.method, result.path);
    mergeArray(entry.response_statuses, [Number(result.status || 0)].filter(Boolean));
    mergeArray(entry.request_field_names, result.request_field_names);
    mergeArray(entry.response_field_names, result.response_field_names);
    mergeArray(entry.session_sources, [normalizeSessionSource(result.session_source)]);
    mergeArray(entry.observed_at, [normalizeTimestamp(result.timestamp)]);
    entry.verification = result.verification || classifyLiveResult(result);
  }

  return [...inventory.values()]
    .map((entry) => {
      const safety = endpointSafety(entry.path);
      const verification = (entry.blocked_by_policy || policyBlockedPaths.has(entry.path)) && entry.response_statuses.size === 0
        ? 'untested'
        : entry.verification;
      return {
        method: entry.method,
        path: entry.path,
        classification: endpointClassification(entry.path, verification),
        safety,
        verification,
        in_static_clients: entry.in_static_clients,
        response_statuses: [...entry.response_statuses].sort((a, b) => a - b),
        request_field_names: [...entry.request_field_names].sort(),
        response_field_names: [...entry.response_field_names].sort(),
        session_sources: [...entry.session_sources].sort(),
        observed_at: [...entry.observed_at].sort()
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

function countBy(entries, key) {
  return entries.reduce((counts, entry) => {
    const value = entry[key];
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

export function createEndpointArtifact({ authentication, staticEndpoints, observations, liveResults, generatedAt } = {}) {
  const endpoints = buildEndpointInventory({ staticEndpoints, observations, liveResults });
  return {
    schema_version: 1,
    generated_at: normalizeTimestamp(generatedAt) || new Date().toISOString(),
    authentication: {
      provenance: authentication?.provenance === 'fresh-cdp' ? 'fresh-cdp' : 'existing-session',
      session_source: normalizeSessionSource(authentication?.session_source),
      captured_at: normalizeTimestamp(authentication?.captured_at),
      validated_at: normalizeTimestamp(authentication?.validated_at),
      validation_endpoint: authentication?.validation_endpoint
        ? normalizeEndpointPath(authentication.validation_endpoint)
        : '',
      validation_status: Number(authentication?.validation_status || 0),
      validation_classification: authentication?.validation_classification || 'untested'
    },
    policy: {
      live_test_mode: 'read-only-only',
      sensitive_values_recorded: false
    },
    summary: {
      static_endpoint_count: new Set(staticEndpoints || []).size,
      inventory_endpoint_count: endpoints.length,
      classification_counts: countBy(endpoints, 'classification'),
      verification_counts: countBy(endpoints, 'verification'),
      blocked_endpoint_count: new Set(
        (observations || [])
          .filter((entry) => entry.blocked_by_policy)
          .map((entry) => `${String(entry.method || 'POST').toUpperCase()} ${normalizeEndpointPath(entry.path)}`)
      ).size
    },
    endpoints
  };
}

function markdownCell(values = []) {
  return values.length ? values.join(', ') : '-';
}

export function renderEndpointReport(artifact = {}) {
  const auth = artifact.authentication || {};
  const fresh = auth.provenance === 'fresh-cdp';
  const authStatement = fresh
    ? `Authentication was freshly captured through ${auth.session_source || 'Chrome CDP'} and validated with \`${auth.validation_endpoint}\` before the session file was written.`
    : `Authentication was loaded from an existing session file (${auth.session_source || 'source unknown'}); this run did not prove a fresh CDP capture.`;
  const counts = artifact.summary?.classification_counts || {};
  const lines = [
    '# DuoPlus Endpoint Discovery Report',
    '',
    `Generated: ${artifact.generated_at || ''}`,
    '',
    '## Authentication provenance',
    '',
    authStatement,
    '',
    `Validation result: ${auth.validation_classification || 'untested'} (HTTP ${auth.validation_status || '-'}); validated at: ${auth.validated_at || '-'}.`,
    '',
    'No tokens, cookies, raw headers, credentials, phone numbers, device identifiers, or response values are included in this report or its machine-readable artifact.',
    '',
    '## Summary',
    '',
    `- Static client endpoints: \`${artifact.summary?.static_endpoint_count || 0}\``,
    `- Total inventory endpoints: \`${artifact.summary?.inventory_endpoint_count || 0}\``,
    `- Live verified: \`${counts['live verified'] || 0}\``,
    `- Authentication failed: \`${counts['authentication failed'] || 0}\``,
    `- Unavailable: \`${counts.unavailable || 0}\``,
    `- State-changing: \`${counts['state-changing'] || 0}\``,
    `- Billable: \`${counts.billable || 0}\``,
    `- Untested: \`${counts.untested || 0}\``,
    `- Endpoints blocked by safety policy: \`${artifact.summary?.blocked_endpoint_count || 0}\``,
    '',
    'Safety classification takes precedence over verification. Unknown, state-changing, and billable endpoints are blocked before transmission by the discovery command.',
    '',
    '## Inventory',
    '',
    '| Method | Endpoint | Classification | Verification | Status | Request fields | Response fields | Static |',
    '|---|---|---|---|---|---|---|---|'
  ];

  for (const endpoint of artifact.endpoints || []) {
    lines.push(
      `| ${endpoint.method} | \`${endpoint.path}\` | ${endpoint.classification} | ${endpoint.verification} | ${markdownCell(endpoint.response_statuses)} | ${markdownCell(endpoint.request_field_names)} | ${markdownCell(endpoint.response_field_names)} | ${endpoint.in_static_clients ? 'yes' : 'no'} |`
    );
  }
  lines.push('');
  return lines.join('\n');
}
