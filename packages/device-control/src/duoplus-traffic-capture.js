/**
 * Duoplus Traffic Capture
 *
 * Read-only, redacted capture of every HTTP request a `DuoplusClient` makes.
 * Lets us observe what DuoPlus's *native* agent is doing on a phone (vs. what
 * our worker does) without leaking credentials or burning rate limits.
 *
 * How to use
 * ==========
 *   import { DuoplusClient } from '@julio/device-control';
 *   import { wrapDuoplusClientForCapture } from '@julio/device-control/duoplus-traffic-capture';
 *
 *   const client = new DuoplusClient({ apiKey: process.env.DUOPLUS_API_KEY });
 *
 *   // Wrap ONLY when you want to capture — set CAPTURE_DUOPLUS_TRAFFIC=1.
 *   const captured = process.env.CAPTURE_DUOPLUS_TRAFFIC
 *     ? wrapDuoplusClientForCapture(client, {
 *         sink: createNdjsonFileSink('./docs/duoplus-traffic-capture.ndjson'),
 *         source: 'duoplus-native-agent', // free-form tag for which consumer
 *       })
 *     : client;
 *
 *   // captured.listCloudPhones(), getPhoneStatus(), etc. behave identically.
 *
 * Safety properties
 * =================
 * - All entries pass through `redactDuoPlusCapture` before being written.
 *   The redaction list covers: authorization / cookie / token / secret /
 *   password / session / signature / signed_url / api_key / auth / sign /
 *   duoplus_api_key / adb_password, plus AWS-style query params (x-amz-*).
 * - Capture is append-only and local. No network egress of captures.
 * - Capture NEVER mutates the request — only records after `request()`
 *   resolves, so it cannot affect timing or endpoint selection.
 * - File writes are synchronous via `fs.appendFileSync` (NDJSON, one line
 *   per call) to guarantee ordering on crash. Slowest path; capture is
 *   expected to be OFF in production.
 */

import fs from 'node:fs';
import path from 'node:path';
import { redactDuoPlusCapture } from './duoplus-client.js';

const REDACTED_HEADERS_ALWAYS = new Set([
  'authorization',
  'cookie',
  'duoplus-api-key',
  'x-amz-security-token'
]);

/**
 * @typedef {Object} CaptureEntry
 * @property {string} ts                     ISO timestamp (when request STARTED)
 * @property {string} source                 Free-form tag ("duoplus-native-agent" | "duoplus-mcp-agent" | "manual")
 * @property {string} method                 HTTP method (uppercase)
 * @property {string} path                   API path (no query)
 * @property {string} url                    Full URL with redacted query
 * @property {Object} redactedHeaders        Headers w/ sensitive ones → "[REDACTED]"
 * @property {Object} redactedBody           Body w/ sensitive values → "[REDACTED]"
 * @property {number} status                 HTTP status (0 if network failure)
 * @property {boolean} ok                    true if request succeeded
 * @property {number} durationMs             Wall time the request took
 * @property {string|null} error             Error message if the request threw
 */

function redactHeaders(headers = {}) {
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    if (REDACTED_HEADERS_ALWAYS.has(String(key).toLowerCase())) {
      out[key] = '[REDACTED]';
    } else {
      out[key] = redactDuoPlusCapture(value);
    }
  }
  return out;
}

/**
 * Wrap an existing `DuoplusClient` instance so every `request()` call also
 * emits a `CaptureEntry` to the provided sink. Returns a Proxy with the same
 * interface — methods behave identically, only the internal `request` is
 * intercepted.
 *
 * @param {import('./duoplus-client.js').DuoplusClient} client
 * @param {{ sink: (entry: CaptureEntry) => void, source?: string }} options
 */
export function wrapDuoplusClientForCapture(client, { sink, source = 'unspecified' } = {}) {
  if (!sink || typeof sink !== 'function') {
    throw new Error('wrapDuoplusClientForCapture: `sink` must be a function');
  }
  const originalRequest = client.request.bind(client);

  client.request = async function capturedRequest(path, opts = {}) {
    const method = String(opts.method || 'POST').toUpperCase();
    const body = opts.body || {};
    const headers = opts.headers || {};
    const tsStart = Date.now();
    const tsIso = new Date(tsStart).toISOString();

    let status = 0;
    let ok = false;
    let error = null;
    let data = null;

    try {
      data = await originalRequest(path, opts);
      status = 200;
      ok = true;
      return data;
    } catch (err) {
      error = err?.message || String(err);
      // Best-effort: pull status out of the error details if available
      status = Number(err?.details?.status || 0);
      ok = false;
      throw err;
    } finally {
      const durationMs = Date.now() - tsStart;
      /** @type {CaptureEntry} */
      const entry = {
        ts: tsIso,
        source,
        method,
        path: String(path || ''),
        url: redactUrl(`https://openapi.duoplus.net${path || ''}`),
        redactedHeaders: redactHeaders({ ...headers, 'DuoPlus-API-Key': '[REDACTED]' }),
        redactedBody: redactDuoPlusCapture(body),
        status,
        ok,
        durationMs,
        error
      };
      try {
        sink(entry);
      } catch (sinkErr) {
        // Capture failures must NEVER break the underlying request.
        // eslint-disable-next-line no-console
        console.error('[duoplus-traffic-capture] sink threw, dropping entry:', sinkErr?.message);
      }
    }
  };

  return client;
}

/**
 * Sink factory: append each entry as one line of NDJSON to the given file.
 * Creates parent dirs on first use. Synchronous (durability over perf).
 *
 * @param {string} filePath
 */
export function createNdjsonFileSink(filePath) {
  const absPath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  return function ndjsonFileSink(entry) {
    fs.appendFileSync(absPath, JSON.stringify(entry) + '\n', 'utf8');
  };
}

/**
 * Sink factory: pretty-print each entry to stdout. Useful for live debugging.
 */
export function createStdoutSink() {
  return function stdoutSink(entry) {
    // eslint-disable-next-line no-console
    console.log(
      `[DUOPLUS] ${entry.ts} ${entry.method} ${entry.path} → ${entry.status} (${entry.durationMs}ms)`
    );
  };
}

/**
 * Sink factory: combine multiple sinks into one.
 *
 * @param {...(entry: CaptureEntry) => void} sinks
 */
export function compositeSink(...sinks) {
  return function compositeSinkEntry(entry) {
    for (const s of sinks) s(entry);
  };
}

/**
 * Redact URL query params that are typically sensitive. Duplicates
 * `redactUrl` from duoplus-client.js but kept local so this module can be
 * reused if the parent redaction helper moves.
 */
function redactUrl(value) {
  try {
    const u = new URL(String(value));
    for (const key of Array.from(u.searchParams.keys())) {
      if (/(token|key|secret|signature|session|password|auth)/i.test(key)) {
        u.searchParams.set(key, '[REDACTED]');
      }
    }
    return u.toString();
  } catch {
    return String(value || '');
  }
}
