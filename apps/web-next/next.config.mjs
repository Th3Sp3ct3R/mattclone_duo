import { loadRootEnv } from '@julio/config/env';

loadRootEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Allow importing workspace packages from outside this app directory.
    externalDir: true
  },
  transpilePackages: [
    '@julio/ui',
    '@julio/design-tokens',
    '@julio/validation',
    '@julio/shared',
    '@julio/api-client',
    '@julio/notifications',
    '@julio/assets',
    '@julio/api',
    '@julio/chatbot'
  ],
};

export default nextConfig;


