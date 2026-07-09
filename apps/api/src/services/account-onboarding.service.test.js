import { jest } from '@jest/globals';

jest.unstable_mockModule('@julio/api/models/engine-account', () => ({
  EngineAccount: {
    findById: jest.fn()
  }
}));

jest.unstable_mockModule('@julio/api/models/engine-post', () => ({
  EnginePost: {
    findOneAndUpdate: jest.fn()
  }
}));

jest.unstable_mockModule('@julio/api/services/job-dispatch', () => ({
  dispatchEngineJob: jest.fn()
}));

const { EngineAccount } = await import('@julio/api/models/engine-account');
const { EnginePost } = await import('@julio/api/models/engine-post');
const { dispatchEngineJob } = await import('@julio/api/services/job-dispatch');
const { enqueueAccountOnboarding } = await import('./account-onboarding.service.js');

describe('enqueueAccountOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('allows Instagram onboarding through the shared login/profile flow', async () => {
    EngineAccount.findById.mockResolvedValue({
      _id: '64f000000000000000000010',
      platform: 'instagram',
      assignedDeviceId: '64f000000000000000000020'
    });
    EnginePost.findOneAndUpdate.mockResolvedValue({
      _id: '64f000000000000000000030'
    });
    dispatchEngineJob.mockResolvedValue({ id: 'run-id' });

    const result = await enqueueAccountOnboarding({ accountId: '64f000000000000000000010' });

    expect(result.ok).toBe(true);
    expect(dispatchEngineJob).toHaveBeenCalledTimes(1);
    expect(result.account.platform).toBe('instagram');
  });

  test('supports warmup continuation for Instagram', async () => {
    EngineAccount.findById.mockResolvedValue({
      _id: '64f000000000000000000011',
      platform: 'instagram',
      assignedDeviceId: '64f000000000000000000021'
    });
    dispatchEngineJob.mockResolvedValue({ id: 'run-id' });

    await enqueueAccountOnboarding({ accountId: '64f000000000000000000011', warmup: true });

    expect(dispatchEngineJob).toHaveBeenCalledTimes(1);
  });

  test('rejects platforms other than TikTok/Instagram', async () => {
    EngineAccount.findById.mockResolvedValue({
      _id: '64f000000000000000000012',
      platform: 'youtube',
      assignedDeviceId: '64f000000000000000000022'
    });

    await expect(enqueueAccountOnboarding({ accountId: '64f000000000000000000012' })).rejects.toThrow(
      'onboarding supports TikTok and Instagram accounts only'
    );
    expect(dispatchEngineJob).not.toHaveBeenCalled();
  });

  test('requires an assigned device', async () => {
    EngineAccount.findById.mockResolvedValue({ _id: '64f000000000000000000013', platform: 'instagram', assignedDeviceId: null });
    await expect(enqueueAccountOnboarding({ accountId: '64f000000000000000000013' })).rejects.toThrow(
      'Account has no assigned device'
    );
  });
});
