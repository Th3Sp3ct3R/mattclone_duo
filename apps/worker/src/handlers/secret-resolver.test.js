import { jest } from '@jest/globals';

import { hydrateAccountSecrets, resolveSecretRef } from './secret-resolver.js';

test('resolves env secret references', async () => {
  await expect(resolveSecretRef('env:TIKTOK_TEST_PASSWORD', { env: { TIKTOK_TEST_PASSWORD: 'secret-value' } })).resolves.toBe(
    'secret-value'
  );
});

test('resolves keychain secret references with an injected reader', async () => {
  const readKeychain = jest.fn().mockResolvedValue('keychain-secret');

  await expect(resolveSecretRef('keychain:tiktok-sxarh-password', { readKeychain })).resolves.toBe('keychain-secret');

  expect(readKeychain).toHaveBeenCalledWith('tiktok-sxarh-password');
});

test('rejects unsupported secret reference schemes', async () => {
  await expect(resolveSecretRef('file:/tmp/password')).rejects.toThrow(/Unsupported secret reference scheme/);
});

test('redacts secret lookup error details', async () => {
  const readKeychain = jest.fn().mockRejectedValue(new Error('lookup failed with actual-secret-value'));

  await expect(resolveSecretRef('keychain:tiktok-sxarh-password', { readKeychain })).rejects.toThrow(
    'Failed to resolve keychain secret "tiktok-sxarh-password"'
  );
  await expect(resolveSecretRef('keychain:tiktok-sxarh-password', { readKeychain })).rejects.not.toThrow(
    /actual-secret-value/
  );
});

test('hydrates account credential refs without mutating the account document', async () => {
  const account = {
    _id: 'account-1',
    platform: 'tiktok',
    credentials: {
      username: 'authorized-test',
      password: '',
      emailPassword: '',
      secretRefs: {
        password: 'env:ACCOUNT_PASSWORD',
        emailPassword: 'env:ACCOUNT_EMAIL_PASSWORD',
        totp: 'env:ACCOUNT_TOTP'
      }
    }
  };

  const hydrated = await hydrateAccountSecrets(account, {
    env: {
      ACCOUNT_PASSWORD: 'resolved-password',
      ACCOUNT_EMAIL_PASSWORD: 'resolved-email-password',
      ACCOUNT_TOTP: 'resolved-totp'
    }
  });

  expect(hydrated).not.toBe(account);
  expect(hydrated.credentials).toMatchObject({
    username: 'authorized-test',
    password: 'resolved-password',
    emailPassword: 'resolved-email-password',
    totpSecret: 'resolved-totp'
  });
  expect(account.credentials.password).toBe('');
  expect(account.credentials.emailPassword).toBe('');
  expect(account.credentials.totpSecret).toBeUndefined();
});
