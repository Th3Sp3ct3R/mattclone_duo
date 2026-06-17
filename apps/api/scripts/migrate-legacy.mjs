import { loadRootEnv } from '@julio/config/env';

import { migrateLegacy } from './legacy-migrate/index.mjs';

loadRootEnv();

migrateLegacy().catch((err) => {
  console.error(err);
  process.exit(1);
});
