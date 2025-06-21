import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  // Create a demo user
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@familyboard.com' },
    update: {},
    create: {
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@familyboard.com',
      password: hashedPassword,
      avatarUrl: 'https://via.placeholder.com/150',
    },
  });

// Create a demo user
const hashedSamiPassword = await bcrypt.hash('123456', 12);
  
const samiUser = await prisma.user.upsert({
  where: { email: 'sami@sami.com' },
  update: {},
  create: {
    firstName: 'Sami',
    lastName: 'Touil',
    email: 'sami@sami.com',
    password: hashedSamiPassword,
    avatarUrl: 'https://media.licdn.com/dms/image/v2/D4E03AQE4IJVovK-HKw/profile-displayphoto-shrink_100_100/profile-displayphoto-shrink_100_100/0/1713184099424?e=1755734400&v=beta&t=4O-si3Ynb3QBu2RIwpXo98WcKd0OPvL83t54aNAiojY',
  },
});

  console.log('✅ Created Sami user:', samiUser.email);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 