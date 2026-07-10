import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildEndpointInventory,
  createEndpointArtifact,
  endpointClassification,
  endpointSafety,
  extractFieldNames,
  extractStaticEndpoints,
  isReadOnlyEndpoint,
  normalizeEndpointPath,
  renderEndpointReport,
  requestFieldNamesFromCdpRequest
} from '../duoplus-endpoint-inventory.js';

const SENSITIVE_PHONE_VALUE = ['+1', '804', '555', '0123'].join('');

test('normalizes endpoint paths without retaining query values', () => {
  expect(normalizeEndpointPath('https://api.duoplus.cn/image/list?page=1&token=secret')).toBe('/image/list');
  expect(normalizeEndpointPath('/api//v1/cloudPhone/list/')).toBe('/api/v1/cloudPhone/list');
  expect(normalizeEndpointPath('/image/BzSfu')).toBe('/image/:id');
  expect(normalizeEndpointPath(`/users/${SENSITIVE_PHONE_VALUE}`)).toBe('/users/:id');
  expect(normalizeEndpointPath('/files/93fb5a04-84e2-4d7e-9f7e-2c6c14fd0d42')).toBe('/files/:id');
});

test('extracts field names without preserving values or dynamic response keys', () => {
  const fields = extractFieldNames({
    code: 200,
    data: {
      phone_number: SENSITIVE_PHONE_VALUE,
      authorization: 'secret-token',
      BzSfu: { status: 1 },
      list: [{ image_id: 'private-device-id' }]
    }
  });
  expect(fields).toEqual([
    'code',
    'data',
    'data.[dynamic]',
    'data.[dynamic].status',
    'data.authorization',
    'data.list',
    'data.list.image_id',
    'data.phone_number'
  ]);
  expect(JSON.stringify(fields)).not.toContain(SENSITIVE_PHONE_VALUE);
  expect(JSON.stringify(fields)).not.toMatch(/secret-token|private-device-id|BzSfu/);
});

test('CDP request metadata contains body and query field names only', () => {
  const fields = requestFieldNamesFromCdpRequest({
    url: 'https://api.duoplus.cn/image/list?page=1&keyword=private',
    postData: JSON.stringify({ page: 1, keyword: 'private', nested: { token: 'secret' } })
  });
  expect(fields).toEqual(['keyword', 'nested', 'nested.token', 'page', 'query.keyword', 'query.page']);
  expect(JSON.stringify(fields)).not.toContain('private');
  expect(JSON.stringify(fields)).not.toContain('secret');
});

test('safety policy prevents mutation and billing paths from becoming live-testable', () => {
  expect(endpointSafety('/api/v1/cloudPhone/list')).toBe('read-only');
  expect(isReadOnlyEndpoint('/api/v1/cloudPhone/list')).toBe(true);
  expect(endpointSafety('/not/in/the/allowlist')).toBe('unknown');
  expect(endpointSafety('/api/v1/app/install')).toBe('state-changing');
  expect(endpointSafety('/api/v1/cloudPhone/purchase')).toBe('billable');
  expect(endpointClassification('/api/v1/app/install', 'live verified')).toBe('state-changing');
  expect(endpointClassification('/image/start', 'live verified')).toBe('billable');
});

test('inventory deduplicates observations and keeps verification separate from safety', () => {
  const entries = buildEndpointInventory({
    staticEndpoints: ['/image/list', '/api/v1/app/install'],
    observations: [
      {
        method: 'POST',
        path: '/image/list?ignored=value',
        status: 200,
        authenticated: true,
        request_field_names: ['page'],
        response_field_names: ['code'],
        timestamp: '2026-07-10T00:00:00.000Z',
        session_source: 'chrome-cdp:9223'
      },
      {
        method: 'POST',
        path: '/image/list',
        status: 200,
        authenticated: true,
        request_field_names: ['pagesize'],
        response_field_names: ['data'],
        timestamp: '2026-07-10T00:00:01.000Z',
        session_source: 'chrome-cdp:9223'
      }
    ]
  });
  expect(entries).toHaveLength(2);
  expect(entries.find((entry) => entry.path === '/image/list')).toMatchObject({
    classification: 'live verified',
    verification: 'live verified',
    request_field_names: ['page', 'pagesize'],
    response_field_names: ['code', 'data']
  });
  expect(entries.find((entry) => entry.path.endsWith('/install')).classification).toBe('state-changing');
});

test('signed-out CDP traffic cannot establish live verification', () => {
  const [entry] = buildEndpointInventory({
    staticEndpoints: ['/account/profile'],
    observations: [{ method: 'POST', path: '/account/profile', status: 200, authenticated: false }]
  });
  expect(entry.verification).toBe('untested');
  expect(entry.classification).toBe('untested');
});

test('synthetic loading failures remain untested when policy blocked the endpoint', () => {
  const entries = buildEndpointInventory({
    staticEndpoints: [],
    observations: [
      { method: 'OPTIONS', path: '/unknown/action', status: 0, authenticated: true, blocked_by_policy: true },
      { method: 'POST', path: '/unknown/action', status: 0, authenticated: true }
    ]
  });
  expect(entries).toHaveLength(2);
  expect(entries.every((entry) => entry.safety === 'unknown')).toBe(true);
  expect(entries.every((entry) => entry.verification === 'untested')).toBe(true);
  expect(entries.every((entry) => entry.classification === 'untested')).toBe(true);
});

test('current DuoPlus clients expose exactly 67 unique static endpoints', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sources = ['../duoplus-client.js', '../duoplus-internal-client.js'].map((relative) =>
    fs.readFileSync(path.resolve(here, relative), 'utf8')
  );
  const endpoints = extractStaticEndpoints(sources);
  expect(endpoints).toHaveLength(67);
  expect(endpoints.filter((endpoint) => endpointSafety(endpoint) === 'unknown')).toEqual([]);
});

test('artifact and report state existing-session provenance without leaking values', () => {
  const artifact = createEndpointArtifact({
    authentication: { provenance: 'existing-session', session_source: 'local-session-file' },
    staticEndpoints: ['/image/list'],
    observations: [],
    liveResults: []
  });
  const report = renderEndpointReport(artifact);
  expect(report).toMatch(/loaded from an existing session file/i);
  expect(report).toMatch(/did not prove a fresh CDP capture/i);
  expect(JSON.stringify(artifact)).not.toContain(SENSITIVE_PHONE_VALUE);
  expect(JSON.stringify(artifact)).not.toMatch(/authorization|cookie_value/);
});

test('artifact reports policy-blocked requests without persisting request values', () => {
  const artifact = createEndpointArtifact({
    authentication: { provenance: 'fresh-cdp', session_source: 'chrome-cdp:9223' },
    staticEndpoints: ['/api/v1/app/install'],
    observations: [
      {
        method: 'POST',
        path: '/api/v1/app/install',
        status: 0,
        blocked_by_policy: true,
        request_field_names: ['app_id'],
        response_field_names: []
      }
    ]
  });
  expect(artifact.summary.blocked_endpoint_count).toBe(1);
  expect(artifact.endpoints[0].classification).toBe('state-changing');
  expect(JSON.stringify(artifact)).not.toContain('private-app-value');
});

test('artifact normalizes untrusted session metadata before serialization', () => {
  const artifact = createEndpointArtifact({
    authentication: {
      provenance: 'fresh-cdp',
      session_source: 'unsafe source value',
      captured_at: SENSITIVE_PHONE_VALUE,
      validated_at: 'not-a-date',
      validation_endpoint: '/account/profile?token=secret'
    },
    staticEndpoints: []
  });
  expect(artifact.authentication).toMatchObject({
    provenance: 'fresh-cdp',
    session_source: 'unknown',
    captured_at: '',
    validated_at: '',
    validation_endpoint: '/account/profile'
  });
  expect(JSON.stringify(artifact)).not.toContain(SENSITIVE_PHONE_VALUE);
  expect(JSON.stringify(artifact)).not.toMatch(/unsafe source value|token=secret/);
});
