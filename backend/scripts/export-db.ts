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
  tasks: any[];
  dayTemplates: any[];
  dayTemplateItems: any[];
  weekTemplates: any[];
  weekTemplateDays: any[];
  weekOverrides: any[];
  taskOverrides: any[];
  exportedAt: string;
}

async function exportDatabase(): Promise<void> {
  console.log('📤 Exporting current database state...');

  try {
    // Export all data with relationships
    const [users, families, familyMembers, familyInvites, familyJoinRequests, tasks, dayTemplates, dayTemplateItems, weekTemplates, weekTemplateDays, weekOverrides, taskOverrides] = await Promise.all([
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
      }),
      prisma.task.findMany({
        orderBy: { createdAt: 'asc' }
      }),
      prisma.dayTemplate.findMany({
        orderBy: { createdAt: 'asc' }
      }),
      prisma.dayTemplateItem.findMany({
        orderBy: { createdAt: 'asc' }
      }),
      prisma.weekTemplate.findMany({
        orderBy: { createdAt: 'asc' }
      }),
      prisma.weekTemplateDay.findMany({
        orderBy: { createdAt: 'asc' }
      }),
      prisma.weekOverride.findMany({
        orderBy: { createdAt: 'asc' }
      }),
      prisma.taskOverride.findMany({
        orderBy: { createdAt: 'asc' }
      })
    ]);

    const exportData: DbExport = {
      users,
      families,
      familyMembers,
      familyInvites,
      familyJoinRequests,
      tasks,
      dayTemplates,
      dayTemplateItems,
      weekTemplates,
      weekTemplateDays,
      weekOverrides,
      taskOverrides,
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
    console.log(`   - Tasks: ${tasks.length}`);
    console.log(`   - Day Templates: ${dayTemplates.length}`);
    console.log(`   - Day Template Items: ${dayTemplateItems.length}`);
    console.log(`   - Week Templates: ${weekTemplates.length}`);
    console.log(`   - Week Template Days: ${weekTemplateDays.length}`);
    console.log(`   - Week Overrides: ${weekOverrides.length}`);
    console.log(`   - Task Overrides: ${taskOverrides.length}`);

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