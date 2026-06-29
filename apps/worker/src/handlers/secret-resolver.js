import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function trimRef(ref = '') {
  return String(ref || '').trim();
}

function plainAccount(account = {}) {
  if (typeof account.toObject === 'function') return account.toObject();
  return {
    ...account,
    credentials: {
      ...(account.credentials || {}),
      secretRefs: { ...(account.credentials?.secretRefs || {}) }
    }
  };
}

async function readMacOSKeychain(service) {
  const args = ['find-generic-password', '-a', process.env.USER || '', '-s', service, '-w'];
  const { stdout } = await execFileAsync('security', args, { encoding: 'utf8' });
  return stdout.trim();
}

export async function resolveSecretRef(ref, opts = {}) {
  const value = trimRef(ref);
  if (!value) return '';

  const separatorIndex = value.indexOf(':');
  if (separatorIndex <= 0) throw new Error('Unsupported secret reference scheme');

  const scheme = value.slice(0, separatorIndex);
  const name = value.slice(separatorIndex + 1);
  if (!name) throw new Error('Secret reference name is required');

  if (scheme === 'env') {
    const env = opts.env || process.env;
    return String(env[name] || '');
  }

  if (scheme === 'keychain') {
    const readKeychain = opts.readKeychain || readMacOSKeychain;
    try {
      return await readKeychain(name);
    } catch {
      throw new Error(`Failed to resolve keychain secret "${name}"`);
    }
  }

  throw new Error('Unsupported secret reference scheme');
}

export async function hydrateAccountSecrets(account, opts = {}) {
  const hydrated = plainAccount(account);
  const credentials = { ...(hydrated.credentials || {}) };
  const secretRefs = credentials.secretRefs || {};

  if (secretRefs.password) {
    credentials.password = await resolveSecretRef(secretRefs.password, opts);
  }
  if (secretRefs.emailPassword) {
    credentials.emailPassword = await resolveSecretRef(secretRefs.emailPassword, opts);
  }
  if (secretRefs.totp) {
    credentials.totpSecret = await resolveSecretRef(secretRefs.totp, opts);
  }

  return {
    ...hydrated,
    credentials
  };
}
