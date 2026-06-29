import { EngineAccount } from './engine-account.model.js';

test('accepts YouTube as an engine account platform', () => {
  const account = new EngineAccount({
    platform: 'youtube',
    credentials: { username: 'youtube-user' }
  });

  expect(account.validateSync()).toBeUndefined();
});

test('stores a checkpoint reason with checkpointed accounts', () => {
  const account = new EngineAccount({
    platform: 'instagram',
    credentials: { username: 'ig-user' },
    status: 'checkpointed',
    checkpointReason: 'two_factor'
  });

  expect(account.validateSync()).toBeUndefined();
});

test('stores credential secret references without requiring raw secrets', () => {
  const account = new EngineAccount({
    platform: 'tiktok',
    credentials: {
      username: 'authorized-test',
      secretRefs: {
        password: 'keychain:tiktok-authorized-test-password',
        emailPassword: 'env:TIKTOK_AUTHORIZED_TEST_EMAIL_PASSWORD',
        totp: 'keychain:tiktok-authorized-test-totp'
      }
    }
  });

  expect(account.validateSync()).toBeUndefined();
  expect(account.credentials.password).toBe('');
  expect(account.credentials.secretRefs.password).toBe('keychain:tiktok-authorized-test-password');
});
