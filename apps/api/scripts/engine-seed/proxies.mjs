import { EngineProxy, EngineProxyAssignment } from '@julio/api/models/engine-proxy';

const countries = ['US', 'US', 'CA', 'GB', 'DE', 'NL'];

export async function seedProxies({ devices }) {
  const proxies = await EngineProxy.insertMany(
    countries.map((countryCode, index) => ({
      label: `Seed ${countryCode} Proxy ${index + 1}`,
      status: index < 4 ? 'assigned' : 'available',
      endpoint: {
        protocol: 'http',
        host: `seed-proxy-${index + 1}.example.net`,
        port: 8000 + index,
        username: `engine_user_${index + 1}`,
        password: `engine_pass_${index + 1}`,
        countryCode
      },
      provider: 'seed-proxy-provider',
      sku: 'mobile-residential',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * (30 + index)),
      health: {
        lastVerifiedAt: new Date(),
        consecutiveFailures: index === 5 ? 1 : 0,
        lastFailureReason: index === 5 ? 'slower than threshold' : ''
      }
    }))
  );

  const assignments = await EngineProxyAssignment.insertMany(
    proxies.slice(0, 4).map((proxy, index) => ({
      proxyId: proxy._id,
      deviceId: devices[index]?._id || null,
      assignedAt: new Date(Date.now() - 1000 * 60 * 60 * (index + 1)),
      reason: 'Seeded device proxy assignment'
    }))
  );

  return { proxies, assignments };
}
