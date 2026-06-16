import { EngineAccount } from '@julio/api/models/engine-account';

const niches = ['ai-music', 'fitness-clips', 'luxury-travel', 'street-food'];

function buildAccount(index, platform, devices, proxies) {
  const nicheKey = niches[index % niches.length];
  const status = index % 9 === 0 ? 'cooldown' : index % 7 === 0 ? 'new' : 'active';
  const device = devices[index % devices.length];
  const proxy = proxies[index % proxies.length];
  return {
    platform,
    status,
    credentials: {
      username: `${platform}_${nicheKey.replace('-', '_')}_${index + 1}`,
      password: `seed-${platform}-pass-${index + 1}`,
      email: `${platform}.${index + 1}@seed.engine.local`,
      emailPassword: `seed-email-pass-${index + 1}`,
      immutableUserId: `${platform}-uid-${1000 + index}`
    },
    profile: {
      displayName: `${nicheKey.replace('-', ' ')} ${platform} ${index + 1}`,
      bio: `Seeded ${platform} profile for ${nicheKey}.`,
      avatarUrl: '',
      nicheKey,
      personaKey: `persona-${(index % 4) + 1}`
    },
    assignedDeviceId: device?._id || null,
    lastSeenProxyId: proxy?._id || null,
    health: {
      lastLoginCheckAt: new Date(Date.now() - 1000 * 60 * 30 * index),
      lastHealthyAt: status === 'active' ? new Date(Date.now() - 1000 * 60 * 25 * index) : null,
      lastFailureReason: status === 'cooldown' ? 'daily action cap reached' : '',
      consecutiveFailures: status === 'cooldown' ? 1 : 0,
      warmupConfig: { dailyLikeLimit: 20, dailyFollowLimit: 8 }
    },
    tags: [platform, nicheKey]
  };
}

export async function seedAccounts({ devices, proxies }) {
  const accounts = await EngineAccount.insertMany(
    Array.from({ length: 16 }).map((_, index) =>
      buildAccount(index, index % 3 === 0 ? 'instagram' : 'tiktok', devices, proxies)
    )
  );

  return { accounts };
}
