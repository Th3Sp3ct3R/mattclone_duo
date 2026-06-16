import { defineSchema, loadConfig, rules } from '@julio/config';

const schema = defineSchema({
  NEXT_PUBLIC_ANALYTICS_KEY: rules.optionalString(),
  NEXT_PUBLIC_APP_ENV: rules.optionalString('development'),
  NEXT_PUBLIC_API_URL: rules.optionalString()
});

export const appConfig = loadConfig(process.env, schema);

