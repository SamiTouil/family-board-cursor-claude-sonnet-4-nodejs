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
  weekTemplates?: any[];
  weekTemplateDays?: any[];
  weekOverrides?: any[];
  taskOverrides?: any[];
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

  // Seed tasks (depend on families)
  if (exportData.tasks && exportData.tasks.length > 0) {
    for (const taskData of exportData.tasks) {
      await prisma.task.upsert({
        where: { id: taskData.id },
        update: {},
        create: {
          id: taskData.id,
          name: taskData.name,
          description: taskData.description,
          color: taskData.color,
          icon: taskData.icon,
          defaultStartTime: taskData.defaultStartTime,
          defaultDuration: taskData.defaultDuration,
          isActive: taskData.isActive,
          familyId: taskData.familyId,
          createdAt: taskData.createdAt,
          updatedAt: taskData.updatedAt,
        },
      });
    }
    console.log(`✅ Seeded ${exportData.tasks.length} tasks`);
  } else {
    console.log(`ℹ️ No tasks to seed`);
  }

  // Seed day templates (depend on families)
  if (exportData.dayTemplates && exportData.dayTemplates.length > 0) {
    for (const templateData of exportData.dayTemplates) {
      await prisma.dayTemplate.upsert({
        where: { id: templateData.id },
        update: {},
        create: {
          id: templateData.id,
          name: templateData.name,
          description: templateData.description,
          familyId: templateData.familyId,
          createdAt: templateData.createdAt,
          updatedAt: templateData.updatedAt,
        },
      });
    }
    console.log(`✅ Seeded ${exportData.dayTemplates.length} day templates`);
  } else {
    console.log(`ℹ️ No day templates to seed`);
  }

  // Seed day template items (depend on day templates, tasks, and family members)
  if (exportData.dayTemplateItems && exportData.dayTemplateItems.length > 0) {
    for (const itemData of exportData.dayTemplateItems) {
      await prisma.dayTemplateItem.upsert({
        where: { id: itemData.id },
        update: {},
        create: {
          id: itemData.id,
          dayTemplateId: itemData.dayTemplateId,
          taskId: itemData.taskId,
          memberId: itemData.memberId,
          overrideTime: itemData.overrideTime,
          overrideDuration: itemData.overrideDuration,
          sortOrder: itemData.sortOrder || 0,
          createdAt: itemData.createdAt,
          updatedAt: itemData.updatedAt,
        },
      });
    }
    console.log(`✅ Seeded ${exportData.dayTemplateItems.length} day template items`);
  } else {
    console.log(`ℹ️ No day template items to seed`);
  }

  // Seed week templates (depend on families)
  if (exportData.weekTemplates && exportData.weekTemplates.length > 0) {
    for (const templateData of exportData.weekTemplates) {
      await prisma.weekTemplate.upsert({
        where: { id: templateData.id },
        update: {},
        create: {
          id: templateData.id,
          name: templateData.name,
          description: templateData.description,
          isActive: templateData.isActive,
          isDefault: templateData.isDefault,
          applyRule: templateData.applyRule,
          priority: templateData.priority,
          familyId: templateData.familyId,
          createdAt: templateData.createdAt,
          updatedAt: templateData.updatedAt,
        },
      });
    }
    console.log(`✅ Seeded ${exportData.weekTemplates.length} week templates`);
  } else {
    console.log(`ℹ️ No week templates to seed`);
  }

  // Seed week template days (depend on week templates and day templates)
  if (exportData.weekTemplateDays && exportData.weekTemplateDays.length > 0) {
    for (const dayData of exportData.weekTemplateDays) {
      await prisma.weekTemplateDay.upsert({
        where: { id: dayData.id },
        update: {},
        create: {
          id: dayData.id,
          weekTemplateId: dayData.weekTemplateId,
          dayOfWeek: dayData.dayOfWeek,
          dayTemplateId: dayData.dayTemplateId,
          createdAt: dayData.createdAt,
          updatedAt: dayData.updatedAt,
        },
      });
    }
    console.log(`✅ Seeded ${exportData.weekTemplateDays.length} week template days`);
  } else {
    console.log(`ℹ️ No week template days to seed`);
  }

  // Seed week overrides (depend on families and week templates)
  if (exportData.weekOverrides && exportData.weekOverrides.length > 0) {
    for (const overrideData of exportData.weekOverrides) {
      await prisma.weekOverride.upsert({
        where: { id: overrideData.id },
        update: {},
        create: {
          id: overrideData.id,
          weekStartDate: overrideData.weekStartDate,
          weekTemplateId: overrideData.weekTemplateId,
          familyId: overrideData.familyId,
          createdAt: overrideData.createdAt,
          updatedAt: overrideData.updatedAt,
        },
      });
    }
    console.log(`✅ Seeded ${exportData.weekOverrides.length} week overrides`);
  } else {
    console.log(`ℹ️ No week overrides to seed`);
  }

  // Seed task overrides (depend on week overrides, tasks, and users)
  if (exportData.taskOverrides && exportData.taskOverrides.length > 0) {
    for (const overrideData of exportData.taskOverrides) {
      await prisma.taskOverride.upsert({
        where: { id: overrideData.id },
        update: {},
        create: {
          id: overrideData.id,
          weekOverrideId: overrideData.weekOverrideId,
          assignedDate: overrideData.assignedDate,
          taskId: overrideData.taskId,
          action: overrideData.action,
          originalMemberId: overrideData.originalMemberId,
          newMemberId: overrideData.newMemberId,
          overrideTime: overrideData.overrideTime,
          overrideDuration: overrideData.overrideDuration,
          createdAt: overrideData.createdAt,
          updatedAt: overrideData.updatedAt,
        },
      });
    }
    console.log(`✅ Seeded ${exportData.taskOverrides.length} task overrides`);
  } else {
    console.log(`ℹ️ No task overrides to seed`);
  }

  console.log(`🎉 Successfully seeded database from export (${exportData.exportedAt})`);
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
      console.error('❌ Failed to seed from export:', error);
      throw error;
    }
  } else {
    console.error('❌ No exported data found. Please run database export first.');
    throw new Error('No exported data available for seeding');
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