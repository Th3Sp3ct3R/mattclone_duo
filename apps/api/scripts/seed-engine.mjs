import { loadRootEnv } from '@julio/config/env';

import { seedEngine } from './engine-seed/index.mjs';

loadRootEnv();

seedEngine().catch((err) => {
  console.error(err);
  process.exit(1);
});
