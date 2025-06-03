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

  console.log('✅ Created demo user:', user.email);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 