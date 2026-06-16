import { defineSchema, loadConfig, rules } from '@julio/config';

const schema = defineSchema({
  EXPO_PUBLIC_API_URL: rules.optionalString(),
  EXPO_PUBLIC_ANALYTICS_KEY: rules.optionalString(),
  EXPO_PUBLIC_APP_ENV: rules.optionalString('development')
});

export const appConfig = loadConfig(process.env, schema);

