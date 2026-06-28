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
