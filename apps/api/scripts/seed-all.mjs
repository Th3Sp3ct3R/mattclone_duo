import { loadRootEnv } from '@julio/config/env';

import { seedUsers } from './seed-users.mjs';
import { seedBlog } from './seed-blog.mjs';
// import { seedEngine } from './engine-seed/index.mjs';

loadRootEnv();

async function seedAll() {
  await seedUsers();
  await seedBlog();
  // await seedEngine();
  console.log('[seed] all seeders completed');
}

seedAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
