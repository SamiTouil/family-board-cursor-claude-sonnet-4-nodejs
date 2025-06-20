import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface DbExport {
  users: any[];
  families: any[];
  familyMembers: any[];
  familyInvites: any[];
  familyJoinRequests: any[];
  exportedAt: string;
}

async function seedFromExport(exportData: DbExport): Promise<void> {
  console.log('🔄 Seeding from exported data...');

  // Seed users first (they have no dependencies)
  for (const userData of exportData.users) {
    await prisma.user.upsert({
      where: { id: userData.id },
      update: {},
      create: {
        id: userData.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password, // Already hashed
        avatarUrl: userData.avatarUrl,
        isVirtual: userData.isVirtual || false,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      },
    });
  }
  console.log(`✅ Seeded ${exportData.users.length} users`);

  // Seed families (depend on users)
  for (const familyData of exportData.families) {
    await prisma.family.upsert({
      where: { id: familyData.id },
      update: {},
      create: {
        id: familyData.id,
        name: familyData.name,
        description: familyData.description,
        avatarUrl: familyData.avatarUrl,
        creatorId: familyData.creatorId,
        createdAt: familyData.createdAt,
        updatedAt: familyData.updatedAt,
      },
    });
  }
  console.log(`✅ Seeded ${exportData.families.length} families`);

  // Seed family members (depend on users and families)
  for (const memberData of exportData.familyMembers) {
    await prisma.familyMember.upsert({
      where: { id: memberData.id },
      update: {},
      create: {
        id: memberData.id,
        role: memberData.role,
        userId: memberData.userId,
        familyId: memberData.familyId,
        joinedAt: memberData.joinedAt,
      },
    });
  }
  console.log(`✅ Seeded ${exportData.familyMembers.length} family members`);

  // Seed family invites (depend on users and families)
  for (const inviteData of exportData.familyInvites) {
    await prisma.familyInvite.upsert({
      where: { id: inviteData.id },
      update: {},
      create: {
        id: inviteData.id,
        code: inviteData.code,
        status: inviteData.status,
        familyId: inviteData.familyId,
        senderId: inviteData.senderId,
        receiverId: inviteData.receiverId,
        expiresAt: inviteData.expiresAt,
        createdAt: inviteData.createdAt,
        updatedAt: inviteData.updatedAt,
        respondedAt: inviteData.respondedAt,
      },
    });
  }
  console.log(`✅ Seeded ${exportData.familyInvites.length} family invites`);

  // Seed join requests (depend on users, families, and invites)
  for (const requestData of exportData.familyJoinRequests) {
    await prisma.familyJoinRequest.upsert({
      where: { id: requestData.id },
      update: {},
      create: {
        id: requestData.id,
        status: requestData.status,
        userId: requestData.userId,
        familyId: requestData.familyId,
        inviteId: requestData.inviteId,
        reviewerId: requestData.reviewerId,
        message: requestData.message,
        createdAt: requestData.createdAt,
        updatedAt: requestData.updatedAt,
        respondedAt: requestData.respondedAt,
      },
    });
  }
  console.log(`✅ Seeded ${exportData.familyJoinRequests.length} join requests`);

  console.log(`🎉 Successfully seeded database from export (${exportData.exportedAt})`);
}

async function seedDefaultData(): Promise<void> {
  console.log('🌱 Seeding default demo data...');

  // Create demo users
  const hashedPassword = await bcrypt.hash('password123', 12);
  const hashedSamiPassword = await bcrypt.hash('123456', 12);
  
  const demoUser = await prisma.user.upsert({
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

  console.log('✅ Created demo users:', demoUser.email, samiUser.email);
}

async function main(): Promise<void> {
  console.log('🌱 Starting database seeding...');

  // Check if exported data exists
  const exportPath = path.join(__dirname, '../../data/db-export.json');
  
  if (fs.existsSync(exportPath)) {
    try {
      console.log('📁 Found exported data, using it for seeding...');
      const exportData: DbExport = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
      await seedFromExport(exportData);
    } catch (error) {
      console.error('❌ Failed to seed from export, falling back to default data:', error);
      await seedDefaultData();
    }
  } else {
    console.log('📝 No exported data found, using default demo data...');
    await seedDefaultData();
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 