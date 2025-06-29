const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5432/family_board'
    }
  }
});

async function debugTaskOverrides() {
  try {
    console.log('=== DEBUGGING TASK OVERRIDES ===');
    
    // Get all WeekOverride records for the family
    const weekOverrides = await prisma.weekOverride.findMany({
      where: {
        familyId: 'cmc66ox86000bap3ezyaalsu7'
      },
      include: {
        taskOverrides: true
      }
    });
    
    console.log('WeekOverride records found:', weekOverrides.length);
    
    weekOverrides.forEach((wo, index) => {
      console.log(`\nWeekOverride ${index + 1}:`);
      console.log('  ID:', wo.id);
      console.log('  Week Start Date:', wo.weekStartDate);
      console.log('  Task Overrides:', wo.taskOverrides.length);
      
      wo.taskOverrides.forEach((to, toIndex) => {
        console.log(`    TaskOverride ${toIndex + 1}:`);
        console.log('      ID:', to.id);
        console.log('      Assigned Date:', to.assignedDate);
        console.log('      Task ID:', to.taskId);
        console.log('      Action:', to.action);
      });
    });
    
    // Check for the specific week_override_id from the error
    const specificWeekOverride = await prisma.weekOverride.findUnique({
      where: {
        id: 'cmci6mjmk005peade9yhn0wkd'
      },
      include: {
        taskOverrides: true
      }
    });
    
    if (specificWeekOverride) {
      console.log('\n=== SPECIFIC WEEK OVERRIDE FROM ERROR ===');
      console.log('Week Override ID:', specificWeekOverride.id);
      console.log('Week Start Date:', specificWeekOverride.weekStartDate);
      console.log('Task Overrides:', specificWeekOverride.taskOverrides.length);
      
      specificWeekOverride.taskOverrides.forEach((to, index) => {
        console.log(`  TaskOverride ${index + 1}:`);
        console.log('    Assigned Date:', to.assignedDate);
        console.log('    Task ID:', to.taskId);
        console.log('    Action:', to.action);
      });
    } else {
      console.log('\nSpecific WeekOverride not found');
    }
    
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTaskOverrides(); 