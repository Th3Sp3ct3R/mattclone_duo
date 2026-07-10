#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  classifyLiveResult,
  createEndpointArtifact,
  endpointSafety,
  extractFieldNames,
  extractStaticEndpoints,
  isReadOnlyEndpoint,
  normalizeEndpointPath,
  renderEndpointReport,
  requestFieldNamesFromCdpRequest
} from '../../../packages/device-control/src/duoplus-endpoint-inventory.js';
import {
  isAuthenticatedDuoPlusRequest,
  validateDuoPlusAuthorization,
  writeJsonAtomically
} from '../src/utils/duoplus-session-capture.js';
import {
  cdpRpc,
  closeCdpPage,
  connectCdpWebSocket,
  openCdpPage
} from './lib/cdp-client.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '../../..');
const EXPECTED_STATIC_ENDPOINTS = 67;
const DEFAULT_URL = 'https://my.duoplus.cn/images?page=1&pagesize=10&link_status=0%2C1%2C4&group_id=all&fid=-1';

dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

function resolveFromRoot(value, fallback) {
  const selected = String(value || fallback);
  return path.isAbsolute(selected) ? selected : path.resolve(ROOT_DIR, selected);
}

const config = {
  port: Number(args.port || process.env.DUOPLUS_CDP_PORT || 9223),
  url: String(args.url || DEFAULT_URL),
  waitMs: Number(args['wait-ms'] || 12000),
  sessionFile: resolveFromRoot(args['session-file'] || process.env.DUOPLUS_SESSION_FILE, 'duoplus-session.json'),
  artifactFile: resolveFromRoot(args.artifact, 'output/duoplus-endpoint-discovery.json'),
  reportFile: resolveFromRoot(args.report, 'docs/duoplus-endpoints-live-static-billable-skipped.md'),
  captureCdp: args['no-cdp'] !== true,
  liveTest: args['no-live-test'] !== true
};

function isDuoPlusApiUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' && url.hostname === 'api.duoplus.cn';
  } catch {
    return false;
  }
}

async function captureCdpNetwork() {
  const sessionSource = `chrome-cdp:${config.port}`;
  const page = await openCdpPage({ port: config.port, url: config.url, requireNewTab: true });
  const ws = await connectCdpWebSocket(page.tab.webSocketDebuggerUrl);
  const requests = new Map();
  const observations = [];
  const responseTasks = new Set();
  const interceptionTasks = new Set();
  const blockedNetworkIds = new Set();

  function complete(requestId, responseFieldNames = []) {
    const pending = requests.get(requestId);
    if (!pending) return;
    requests.delete(requestId);
    observations.push({
      method: pending.method,
      path: pending.path,
      status: pending.status,
      authenticated: pending.authenticated,
      blocked_by_policy: pending.blockedByPolicy,
      request_field_names: pending.requestFieldNames,
      response_field_names: responseFieldNames,
      timestamp: pending.timestamp,
      session_source: sessionSource
    });
    blockedNetworkIds.delete(requestId);
  }

  const handleMessage = (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }
    const params = message.params || {};
    if (message.method === 'Fetch.requestPaused') {
      const request = params.request || {};
      if (!isDuoPlusApiUrl(request.url)) {
        cdpRpc(ws, 'Fetch.continueRequest', { requestId: params.requestId }).catch(() => {});
        return;
      }
      const allowed = isReadOnlyEndpoint(request.url);
      if (!allowed) {
        const networkId = params.networkId;
        if (networkId) {
          blockedNetworkIds.add(networkId);
          const pending = requests.get(networkId);
          if (pending) pending.blockedByPolicy = true;
        } else {
          observations.push({
            method: String(request.method || 'GET').toUpperCase(),
            path: normalizeEndpointPath(request.url),
            status: 0,
            authenticated: isAuthenticatedDuoPlusRequest(request.url, request.headers),
            blocked_by_policy: true,
            request_field_names: requestFieldNamesFromCdpRequest(request),
            response_field_names: [],
            timestamp: new Date().toISOString(),
            session_source: sessionSource
          });
        }
      }
      const method = allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest';
      const controlParams = allowed
        ? { requestId: params.requestId }
        : { requestId: params.requestId, errorReason: 'BlockedByClient' };
      const task = cdpRpc(ws, method, controlParams).catch(() => {});
      interceptionTasks.add(task);
      task.finally(() => interceptionTasks.delete(task));
      return;
    }
    if (message.method === 'Network.requestWillBeSent') {
      const request = params.request || {};
      if (!isDuoPlusApiUrl(request.url)) return;
      requests.set(params.requestId, {
        method: String(request.method || 'GET').toUpperCase(),
        path: normalizeEndpointPath(request.url),
        status: 0,
        requestFieldNames: requestFieldNamesFromCdpRequest(request),
        authenticated: isAuthenticatedDuoPlusRequest(request.url, request.headers),
        blockedByPolicy: blockedNetworkIds.has(params.requestId),
        timestamp: new Date().toISOString(),
        mimeType: ''
      });
      return;
    }
    if (message.method === 'Network.responseReceived') {
      const pending = requests.get(params.requestId);
      if (!pending) return;
      pending.status = Number(params.response?.status || 0);
      pending.mimeType = String(params.response?.mimeType || '').toLowerCase();
      return;
    }
    if (message.method === 'Network.loadingFailed') {
      complete(params.requestId);
      return;
    }
    if (message.method !== 'Network.loadingFinished' || !requests.has(params.requestId)) return;
    const task = (async () => {
      const pending = requests.get(params.requestId);
      let fields = [];
      if (pending?.mimeType.includes('json')) {
        try {
          const body = await cdpRpc(ws, 'Network.getResponseBody', { requestId: params.requestId });
          if (!body.base64Encoded) fields = extractFieldNames(body.body);
        } catch {
          fields = [];
        }
      }
      complete(params.requestId, fields);
    })();
    responseTasks.add(task);
    task.finally(() => responseTasks.delete(task));
  };

  try {
    await cdpRpc(ws, 'Network.enable');
    await cdpRpc(ws, 'Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
    await cdpRpc(ws, 'Fetch.enable', {
      patterns: [{ urlPattern: 'https://api.duoplus.cn/*', requestStage: 'Request' }]
    });
    await cdpRpc(ws, 'Page.enable');
    ws.on('message', handleMessage);
    await cdpRpc(ws, 'Page.navigate', { url: config.url });
    await new Promise((resolve) => setTimeout(resolve, config.waitMs));
    await Promise.allSettled([...interceptionTasks]);
    await Promise.allSettled([...responseTasks]);
    for (const requestId of [...requests.keys()]) complete(requestId);
    return observations;
  } finally {
    ws.off('message', handleMessage);
    ws.close();
    await closeCdpPage(config.port, page.tab.id);
  }
}

function readSession() {
  try {
    const session = JSON.parse(fs.readFileSync(config.sessionFile, 'utf8'));
    fs.chmodSync(config.sessionFile, 0o600);
    return session;
  } catch {
    return null;
  }
}

function authenticationMetadata(session, validation) {
  const captured = session?.authentication || {};
  return {
    provenance: captured.provenance === 'fresh-cdp' ? 'fresh-cdp' : 'existing-session',
    session_source: String(session?.session_source || (captured.provenance === 'fresh-cdp' ? `chrome-cdp:${config.port}` : 'local-session-file')),
    captured_at: String(session?.captured_at || ''),
    validated_at: validation?.valid ? new Date().toISOString() : String(captured.validated_at || ''),
    validation_endpoint: String(validation?.endpoint || captured.validation_endpoint || ''),
    validation_status: Number(validation?.status || captured.validation_status || 0),
    validation_classification: String(validation?.classification || 'untested')
  };
}

async function safePost({ baseUrl, path: endpointPath, headers, body, sessionSource }) {
  const timestamp = new Date().toISOString();
  try {
    const response = await fetch(`${String(baseUrl).replace(/\/+$/, '')}${endpointPath}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body || {})
    });
    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    return {
      result: {
        method: 'POST',
        path: endpointPath,
        status: Number(response.status || 0),
        verification: classifyLiveResult({
          status: response.status,
          code: data?.code,
          message: data?.message
        }),
        request_field_names: extractFieldNames(body),
        response_field_names: extractFieldNames(data),
        timestamp,
        session_source: sessionSource
      }
    };
  } catch {
    return {
      result: {
        method: 'POST',
        path: endpointPath,
        status: 0,
        request_field_names: extractFieldNames(body),
        response_field_names: [],
        timestamp,
        session_source: sessionSource,
        verification: 'unavailable'
      }
    };
  }
}

async function liveTestReadOnly(session, validation) {
  if (!config.liveTest) return [];
  const results = [];
  const internalSource = String(session?.session_source || 'local-session-file');
  if (!validation.valid) {
    results.push({
      method: 'POST',
      path: validation.endpoint || '/account/profile',
      status: validation.status,
      request_field_names: [],
      response_field_names: [],
      timestamp: new Date().toISOString(),
      session_source: internalSource,
      verification: validation.classification
    });
    return results;
  }

  const internalRequests = [
    { path: '/account/profile', body: {} },
    { path: '/image/controlList', body: { page: 1, pagesize: 1, region_type_id: '', group_id: 'all', keyword: '' } },
    { path: '/image/list', body: { page: 1, pagesize: 1, group_id: 'all', fid: '-1', link_status: ['0', '1', '2', '4'] } }
  ];
  for (const request of internalRequests) {
    const { result } = await safePost({
      baseUrl: 'https://api.duoplus.cn',
      path: request.path,
      headers: { Authorization: session.authorization, Lang: 'en' },
      body: request.body,
      sessionSource: internalSource
    });
    results.push(result);
  }

  const apiKey = String(process.env.DUOPLUS_API_KEY || '').trim();
  if (!apiKey) return results;
  const openApiSource = 'openapi-key-env';
  const openApiBaseUrl = process.env.DUOPLUS_API_BASE_URL || 'https://openapi.duoplus.net';
  const openApiRequests = [
    { path: '/api/v1/cloudPhone/list', body: { page: 1, pagesize: 1 } },
    { path: '/api/v1/cloudPhone/groupList', body: { page: 1, pagesize: 1 } },
    { path: '/api/v1/cloudPhone/resolutionList', body: {} },
    { path: '/api/v1/cloudPhone/tagList', body: {} },
    { path: '/api/v1/cloudPhone/linkUserList', body: {} },
    { path: '/api/v1/app/list', body: { page: 1, pagesize: 1 } },
    { path: '/api/v1/app/teamList', body: { page: 1, pagesize: 1 } },
    { path: '/api/v1/proxy/list', body: { page: 1, pagesize: 1 } },
    { path: '/api/v1/proxy/check', body: { proxy_ids: [] } },
    { path: '/api/v1/cloudDisk/list', body: { page: 1, pagesize: 1 } },
    { path: '/api/v1/mobile/timezoneList', body: {} },
    { path: '/api/v1/mobile/languageList', body: {} },
    { path: '/api/v1/mobile/modelList', body: {} },
    { path: '/api/v1/automation/planList', body: { page: 1, pagesize: 1 } },
    { path: '/api/v1/team/order', body: { page: 1, pagesize: 1 } },
    { path: '/api/v1/cloudNumber/numberList', body: { page: 1, pagesize: 1 } },
    { path: '/api/v1/subscriptionStartup/list', body: { page: 1, pagesize: 1 } }
  ];
  for (const request of openApiRequests) {
    if (endpointSafety(request.path) !== 'read-only') continue;
    const { result } = await safePost({
      baseUrl: openApiBaseUrl,
      path: request.path,
      headers: { 'DuoPlus-API-Key': apiKey },
      body: request.body,
      sessionSource: openApiSource
    });
    results.push(result);
    if (result.verification === 'authentication failed') break;
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
  return results;
}

function loadStaticEndpoints() {
  const files = [
    path.join(ROOT_DIR, 'packages/device-control/src/duoplus-client.js'),
    path.join(ROOT_DIR, 'packages/device-control/src/duoplus-internal-client.js')
  ];
  const endpoints = extractStaticEndpoints(files.map((file) => fs.readFileSync(file, 'utf8')));
  if (endpoints.length !== EXPECTED_STATIC_ENDPOINTS) {
    throw new Error(`Expected ${EXPECTED_STATIC_ENDPOINTS} static DuoPlus endpoints, found ${endpoints.length}`);
  }
  return endpoints;
}

function writeReport(filePath, content) {
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  try {
    fs.writeFileSync(temporary, content, 'utf8');
    fs.renameSync(temporary, filePath);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

async function main() {
  const staticEndpoints = loadStaticEndpoints();
  const session = readSession();
  const validation = await validateDuoPlusAuthorization({ authorization: session?.authorization });
  const observations = config.captureCdp ? await captureCdpNetwork() : [];
  const liveResults = await liveTestReadOnly(session, validation);
  const artifact = createEndpointArtifact({
    authentication: authenticationMetadata(session, validation),
    staticEndpoints,
    observations,
    liveResults
  });
  writeJsonAtomically(config.artifactFile, artifact);
  writeReport(config.reportFile, renderEndpointReport(artifact));

  console.log(`DuoPlus endpoint discovery complete: ${artifact.summary.inventory_endpoint_count} endpoints`);
  console.log(`Static comparison: ${artifact.summary.static_endpoint_count}/${EXPECTED_STATIC_ENDPOINTS}`);
  console.log(`Machine-readable artifact: ${config.artifactFile}`);
  console.log(`Markdown report: ${config.reportFile}`);
  if (!validation.valid) {
    console.error(`Session rejected: ${validation.classification}`);
    process.exitCode = 3;
  }
}

main().catch((error) => {
  console.error(`DuoPlus endpoint discovery failed: ${error.message}`);
  process.exitCode = 1;
});
