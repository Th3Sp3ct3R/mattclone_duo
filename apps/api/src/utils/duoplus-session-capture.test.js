import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import {
  authorizationFromHeaders,
  isAuthenticatedDuoPlusRequest,
  validateDuoPlusAuthorization,
  writeJsonAtomically
} from './duoplus-session-capture.js';

test('accepts Authorization only from the exact DuoPlus HTTPS API host', () => {
  const headers = { authorization: 'fresh-token' };
  expect(isAuthenticatedDuoPlusRequest('https://api.duoplus.cn/image/list', headers)).toBe(true);
  expect(isAuthenticatedDuoPlusRequest('http://api.duoplus.cn/image/list', headers)).toBe(false);
  expect(isAuthenticatedDuoPlusRequest('https://api.duoplus.cn.attacker.test/image/list', headers)).toBe(false);
  expect(isAuthenticatedDuoPlusRequest('https://my.duoplus.cn/?next=https://api.duoplus.cn', headers)).toBe(false);
  expect(isAuthenticatedDuoPlusRequest('https://api.duoplus.cn/image/list', {})).toBe(false);
  expect(authorizationFromHeaders({ Authorization: 'value' })).toBe('value');
});

test('validates a captured session before accepting it', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, text: async () => '{"code":200,"data":{"private":"ignored"}}' };
  };
  const result = await validateDuoPlusAuthorization({ authorization: 'fresh-token', fetchImpl });
  expect(result).toEqual({
    valid: true,
    classification: 'live verified',
    endpoint: '/account/profile',
    status: 200
  });
  expect(calls).toHaveLength(1);
  expect(calls[0].init.headers.Authorization).toBe('fresh-token');
});

test('rejects stale Authorization without attempting a fallback write candidate', async () => {
  const fetchImpl = jest.fn(async () => ({
    ok: false,
    status: 401,
    text: async () => '{"code":401,"message":"Login expired"}'
  }));
  const result = await validateDuoPlusAuthorization({ authorization: 'stale-token', fetchImpl });
  expect(result).toEqual({
    valid: false,
    classification: 'authentication failed',
    endpoint: '/account/profile',
    status: 401
  });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('falls back to the read-only fleet list when profile validation is unavailable', async () => {
  const fetchImpl = jest
    .fn()
    .mockResolvedValueOnce({ ok: false, status: 404, text: async () => '{"code":404}' })
    .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{"code":200,"data":{"list":[]}}' });
  const result = await validateDuoPlusAuthorization({ authorization: 'fresh-token', fetchImpl });
  expect(result).toMatchObject({ valid: true, endpoint: '/image/controlList', status: 200 });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});

test('writes session files atomically with owner-only permissions', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'duoplus-session-test-'));
  const destination = path.join(directory, 'duoplus-session.json');
  try {
    writeJsonAtomically(destination, { authorization: 'local-only' });
    expect(JSON.parse(fs.readFileSync(destination, 'utf8'))).toEqual({ authorization: 'local-only' });
    expect(fs.statSync(destination).mode & 0o777).toBe(0o600);
    expect(fs.readdirSync(directory)).toEqual(['duoplus-session.json']);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
