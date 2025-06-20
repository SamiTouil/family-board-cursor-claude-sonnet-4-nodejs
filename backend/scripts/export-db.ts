import { PrismaClient } from '@prisma/client';
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

async function exportDatabase(): Promise<void> {
  console.log('📤 Exporting current database state...');

  try {
    // Export all data with relationships
    const [users, families, familyMembers, familyInvites, familyJoinRequests] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'asc' }
      }),
      prisma.family.findMany({
        orderBy: { createdAt: 'asc' }
      }),
      prisma.familyMember.findMany({
        orderBy: { joinedAt: 'asc' }
      }),
      prisma.familyInvite.findMany({
        orderBy: { createdAt: 'asc' }
      }),
      prisma.familyJoinRequest.findMany({
        orderBy: { createdAt: 'asc' }
      })
    ]);

    const exportData: DbExport = {
      users,
      families,
      familyMembers,
      familyInvites,
      familyJoinRequests,
      exportedAt: new Date().toISOString()
    };

    // Create the data directory if it doesn't exist
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write to JSON file
    const exportPath = path.join(dataDir, 'db-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

    console.log('✅ Database exported successfully!');
    console.log(`📁 Export saved to: ${exportPath}`);
    console.log(`📊 Exported data:`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Families: ${families.length}`);
    console.log(`   - Family Members: ${familyMembers.length}`);
    console.log(`   - Family Invites: ${familyInvites.length}`);
    console.log(`   - Join Requests: ${familyJoinRequests.length}`);

  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

async function main(): Promise<void> {
  await exportDatabase();
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 