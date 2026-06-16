import { createAnalytics } from '@julio/analytics';
import { appConfig } from '@/src/config/app-config.js';

export const analytics = createAnalytics({
  context: {
    platform: 'web',
    analyticsKey: appConfig.NEXT_PUBLIC_ANALYTICS_KEY || null,
    environment: appConfig.NEXT_PUBLIC_APP_ENV
  }
});

