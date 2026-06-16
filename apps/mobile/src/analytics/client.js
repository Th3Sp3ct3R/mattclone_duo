import { createAnalytics } from '@julio/analytics';
import { appConfig } from '@/config/app-config.js';

export const analytics = createAnalytics({
  context: {
    platform: 'mobile',
    analyticsKey: appConfig.EXPO_PUBLIC_ANALYTICS_KEY || null,
    environment: appConfig.EXPO_PUBLIC_APP_ENV
  }
});

