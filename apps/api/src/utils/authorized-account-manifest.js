import { findAccountDevicePlatformConflict } from './account-device-platform.js';
import { canDeviceAcceptAccount } from './device-account-eligibility.js';

const ALLOWED_PLATFORMS = new Set(['instagram', 'tiktok', 'youtube']);
const RAW_CREDENTIAL_COLUMNS = new Set([
  'password',
  'email_password',
  'emailPassword',
  'totp',
  'totp_secret',
  'totpSecret'
]);
const SECRET_REF_COLUMNS = new Map([
  ['password_secret_ref', 'password'],
  ['passwordSecretRef', 'password'],
  ['email_password_secret_ref', 'emailPassword'],
  ['emailPasswordSecretRef', 'emailPassword'],
  ['totp_secret_ref', 'totp'],
  ['totpSecretRef', 'totp']
]);

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseTags(value) {
  return String(value || '')
    .split(/[;|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function assertSecretRef(value, line, column) {
  if (!value) return '';
  if (/^(keychain|env):[A-Za-z0-9_.:/-]+$/.test(value)) return value;
  throw new Error(`Line ${line}: ${column} must start with keychain: or env:`);
}

function deviceIdOf(value) {
  if (!value) return '';
  if (value._id) return String(value._id);
  return String(value);
}

function deviceLabel(device = {}) {
  return device.providerDeviceId || device.name || deviceIdOf(device);
}

function findDevice(devices, row) {
  const wanted = String(row.deviceName || '').trim();
  if (!wanted) return null;
  return (
    devices.find((device) => {
      const names = [device._id, device.providerDeviceId, device.name].map((value) => String(value || '').trim());
      return names.includes(wanted);
    }) || null
  );
}

export function parseAuthorizedAccountManifest(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, text: line }))
    .filter(({ text }) => text.trim() && !text.trim().startsWith('#'));

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0].text);
  for (const header of headers) {
    if (RAW_CREDENTIAL_COLUMNS.has(header)) {
      throw new Error(`Raw credential column "${header}" is not allowed; use *_secret_ref columns.`);
    }
  }

  return lines.slice(1).map(({ line, text }) => {
    const cells = parseCsvLine(text);
    const record = Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']));
    const platform = String(record.platform || '').trim().toLowerCase();
    const username = String(record.username || '').trim();

    if (!ALLOWED_PLATFORMS.has(platform)) {
      throw new Error(`Line ${line}: platform must be instagram, tiktok, or youtube.`);
    }
    if (!username) throw new Error(`Line ${line}: username is required.`);

    const secretRefs = { password: '', emailPassword: '', totp: '' };
    for (const [column, key] of SECRET_REF_COLUMNS.entries()) {
      if (Object.hasOwn(record, column)) {
        secretRefs[key] = assertSecretRef(String(record[column] || '').trim(), line, column);
      }
    }

    return {
      line,
      platform,
      username,
      email: String(record.email || '').trim().toLowerCase(),
      secretRefs,
      deviceName: String(record.device_name || record.deviceName || '').trim(),
      tags: parseTags(record.tags)
    };
  });
}

export function buildAuthorizedAccountImportPlan({ rows = [], devices = [], existingAccounts = [] } = {}) {
  const plannedAssignments = [...existingAccounts];
  const accounts = [];
  const errors = [];

  for (const row of rows) {
    const device = findDevice(devices, row);
    if (row.deviceName && !device) {
      errors.push({
        line: row.line,
        code: 'DEVICE_NOT_FOUND',
        message: `Device ${row.deviceName} was not found.`
      });
      continue;
    }

    if (device) {
      const eligibility = canDeviceAcceptAccount(device);
      if (!eligibility.ok) {
        errors.push({
          line: row.line,
          code: eligibility.code,
          message: eligibility.message
        });
        continue;
      }

      const conflict = findAccountDevicePlatformConflict(plannedAssignments, {
        platform: row.platform,
        assignedDeviceId: device._id
      });
      if (conflict) {
        const username = conflict.credentials?.username || 'another account';
        errors.push({
          line: row.line,
          code: 'DEVICE_PLATFORM_ACCOUNT_EXISTS',
          message: `Device ${deviceLabel(device)} already has ${username} assigned for ${row.platform}.`
        });
        continue;
      }
    }

    const doc = {
      platform: row.platform,
      status: 'new',
      credentials: {
        username: row.username,
        password: '',
        email: row.email,
        emailPassword: '',
        secretRefs: row.secretRefs
      },
      assignedDeviceId: device?._id || null,
      tags: ['authorized-import', ...row.tags]
    };
    accounts.push({
      line: row.line,
      filter: { platform: row.platform, 'credentials.username': row.username },
      doc
    });
    plannedAssignments.push({
      _id: `planned:${row.line}`,
      platform: row.platform,
      assignedDeviceId: device?._id || null,
      retiredAt: null,
      credentials: { username: row.username }
    });
  }

  return { accounts, errors };
}
