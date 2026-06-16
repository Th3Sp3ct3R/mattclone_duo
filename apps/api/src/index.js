import { env } from '@julio/api/config/env';
import { logger } from '@julio/api/logger';
import { createApiApp } from '@julio/api/app';

const app = createApiApp();
const port = env.port || 4000;

app.listen(port, () => {
  logger.info(`API listening on :${port}`);
});
