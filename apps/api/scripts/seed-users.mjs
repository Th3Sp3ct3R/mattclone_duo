import bcrypt from 'bcryptjs';

import { loadRootEnv } from '@julio/config/env';
import { connectMongo, disconnectMongo } from '@julio/api/db/mongo';
import { User } from '@julio/api/models/user';

loadRootEnv();

const roles = ['su', 'admin', 'contributor', 'user'];
const seedDomain = process.env.SEED_DOMAIN || 'julio.com';
const seedPassword = process.env.SEED_PASSWORD || '8675309';

function buildEmail(role) {
  return `${role}@${seedDomain}`;
}

export async function seedUsers() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Missing MONGODB_URI');
  }

  await connectMongo(process.env.MONGODB_URI);

  await User.deleteMany({});

  const passwordHash = await bcrypt.hash(seedPassword, 10);

  for (const role of roles) {
    const email = buildEmail(role);
    await User.create({ email, passwordHash, role });
  }

  await disconnectMongo();
  console.log(`[seed] users seeded: ${roles.join(', ')}`);
}

const isDirect = import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isDirect) {
  seedUsers().catch(async (err) => {
    console.error(err);
    try {
      await disconnectMongo();
    } catch {}
    process.exit(1);
  });
}
