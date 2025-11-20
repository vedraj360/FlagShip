import prisma from './prismaClient';
import { hashPassword } from './utils/hash';

async function main() {
  const email = 'admin@example.com';
  const password = 'password123';
  const hash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: hash,
      role: 'ADMIN',
    },
  });

  console.log({ user });

  // Create sample app
  const app = await prisma.application.create({
    data: {
        name: 'My Sample App',
        key: 'sample-app-key-123',
        createdById: user.id,
        flags: {
            create: [
                { key: 'new_feature_beta', displayName: 'New Feature Beta', enabled: true, description: 'Enable beta features' },
                { key: 'maintenance_mode', displayName: 'Maintenance Mode', enabled: false, description: 'Global maintenance' }
            ]
        }
    }
  });
  console.log({app});
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    (process as any).exit(1);
  });