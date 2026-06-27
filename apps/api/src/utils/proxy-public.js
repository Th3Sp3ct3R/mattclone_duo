function publicMetadata(metadata = {}) {
  const lastProtocolCheck = metadata?.lastProtocolCheck
    ? {
        checkedAt: metadata.lastProtocolCheck.checkedAt || null,
        httpOk: Boolean(metadata.lastProtocolCheck.httpOk),
        socks5Ok: Boolean(metadata.lastProtocolCheck.socks5Ok)
      }
    : null;

  return {
    source: metadata?.source || '',
    effectiveIp: metadata?.effectiveIp || '',
    lastProtocolCheck
  };
}

export function publicProxy(proxy = {}) {
  const plain = typeof proxy.toObject === 'function' ? proxy.toObject() : { ...proxy };
  return {
    _id: plain._id,
    label: plain.label || '',
    status: plain.status || 'available',
    endpoint: {
      protocol: plain.endpoint?.protocol || 'http',
      host: plain.endpoint?.host || '',
      port: plain.endpoint?.port || null,
      countryCode: plain.endpoint?.countryCode || ''
    },
    provider: plain.provider || '',
    sku: plain.sku || '',
    expiresAt: plain.expiresAt || null,
    health: plain.health || {},
    metadata: publicMetadata(plain.metadata || {}),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
}

