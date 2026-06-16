import { EnginePost } from '@julio/api/models/engine-post';

const captions = [
  'This hook is built for retention. Watch the payoff.',
  'A simple system that makes the output feel premium.',
  'Save this workflow before your next content batch.',
  'The detail most creators skip is the whole advantage.',
  'Fast setup, clean execution, measurable upside.'
];

function buildStatus(index) {
  if (index % 8 === 0) return 'failed';
  if (index % 5 === 0) return 'draft';
  return 'posted';
}

export async function seedPosts({ accounts, devices, contentItems }) {
  const posts = await EnginePost.insertMany(
    Array.from({ length: 25 }).map((_, index) => {
      const account = accounts[index % accounts.length];
      const device = devices[index % devices.length];
      const contentItem = contentItems[index % contentItems.length];
      const status = buildStatus(index);
      return {
        platform: account.platform,
        status,
        accountId: account._id,
        deviceId: device._id,
        contentPoolItemId: contentItem._id,
        media: {
          sourceUrl: contentItem.sourceUrl,
          storageKey: `seed/posts/${index + 1}.mp4`,
          publicUrl: `https://cdn.example.com/seed/posts/${index + 1}.mp4`,
          mimeType: 'video/mp4',
          durationSeconds: 22 + index,
          width: 1080,
          height: 1920
        },
        publishOptions: {
          caption: captions[index % captions.length],
          hashtags: ['seed', contentItem.platform, account.profile?.nicheKey || 'engine'],
          soundQuery: index % 2 === 0 ? 'trending audio' : '',
          locationQuery: index % 4 === 0 ? 'Los Angeles' : '',
          coverFrameIndex: 2
        },
        scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * (index + 1)),
        postedAt: status === 'posted' ? new Date(Date.now() - 1000 * 60 * 60 * index) : null,
        failure:
          status === 'failed'
            ? { code: 'SEED_FAILURE', message: 'Seeded failure for UI state coverage.', failedAt: new Date() }
            : {},
        externalPostId: status === 'posted' ? `${account.platform}-seed-post-${index + 1}` : '',
        idempotencyKey: `seed-post-${index + 1}`
      };
    })
  );

  return { posts };
}
