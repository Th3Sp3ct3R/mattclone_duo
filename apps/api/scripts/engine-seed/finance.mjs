import { EngineDjekxaOrder, EngineExpense } from '@julio/api/models/engine-finance';
import { EngineJobRun } from '@julio/api/models/engine-job-run';

export async function seedFinance({ accounts, devices, posts }) {
  const expenses = await EngineExpense.insertMany([
    {
      category: 'cloud-phone',
      provider: 'vmos',
      amountCents: 12900,
      description: 'Seed monthly VMOS pad capacity.',
      deviceId: devices[0]._id,
      incurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
    },
    {
      category: 'proxy',
      provider: 'seed-proxy-provider',
      amountCents: 4500,
      description: 'Seed mobile proxy inventory.',
      incurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
    },
    {
      category: 'account',
      provider: 'djekxa',
      amountCents: 1800,
      description: 'Seed purchased social accounts.',
      accountId: accounts[0]._id,
      externalReference: 'DJX-SEED-001',
      incurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
    }
  ]);

  const djekxaOrders = await EngineDjekxaOrder.insertMany(
    accounts.slice(0, 4).map((account, index) => ({
      externalOrderId: `DJX-SEED-${String(index + 1).padStart(3, '0')}`,
      platform: account.platform,
      status: 'imported',
      username: account.credentials.username,
      password: account.credentials.password,
      email: account.credentials.email,
      emailPassword: account.credentials.emailPassword,
      priceRub: 350 + index * 25,
      priceUsdCents: 390 + index * 25,
      importedAccountId: account._id,
      orderedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (index + 1))
    }))
  );

  const jobRuns = await EngineJobRun.insertMany(
    posts.slice(0, 6).map((post, index) => ({
      queueName: 'engine.post',
      jobName: 'publish',
      idempotencyKey: `seed-job-post-${index + 1}`,
      status: 'succeeded',
      targetType: 'post',
      targetId: post._id,
      payload: { postId: String(post._id), platform: post.platform },
      attempts: 1,
      maxAttempts: 3,
      startedAt: new Date(Date.now() - 1000 * 60 * (index + 20)),
      completedAt: new Date(Date.now() - 1000 * 60 * (index + 19))
    }))
  );

  return { expenses, djekxaOrders, jobRuns };
}
