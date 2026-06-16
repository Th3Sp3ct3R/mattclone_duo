import { createLogger } from '@julio/logger';
import { env } from '@julio/api/config/env';

export const logger = createLogger({ level: env.logLevel });
