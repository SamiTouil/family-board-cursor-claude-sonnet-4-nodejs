#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const integrationTestsDir = path.join(__dirname, '../src/__tests__/integration');

// Get all integration test files
const testFiles = fs.readdirSync(integrationTestsDir)
  .filter(file => file.endsWith('.test.ts'))
  .map(file => path.join(integrationTestsDir, file));

console.log('Fixing integration test files...');

testFiles.forEach(filePath => {
  console.log(`Processing: ${path.basename(filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already using itWithDatabase
  if (content.includes('itWithDatabase')) {
    console.log(`  ✅ Already updated`);
    return;
  }
  
  // Add itWithDatabase import if not present
  if (content.includes('getMockUser') && !content.includes('itWithDatabase')) {
    content = content.replace(
      /import { ([^}]*getMockUser[^}]*) } from ['"]\.\.\/integration-setup['"];/,
      "import { $1, itWithDatabase } from '../integration-setup';"
    );
  }
  
  // Replace it( with itWithDatabase( for async tests
  content = content.replace(
    /(\s+)it\('([^']+)', async \(\) => \{/g,
    "$1itWithDatabase('$2', async () => {"
  );
  
  // Handle non-async tests that might need database
  content = content.replace(
    /(\s+)it\('([^']+)', \(\) => \{/g,
    (match, indent, testName) => {
      // Only convert if the test seems to use database operations
      if (match.includes('prisma') || match.includes('UserService') || match.includes('Service')) {
        return `${indent}itWithDatabase('${testName}', async () => {`;
      }
      return match;
    }
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`  ✅ Updated`);
});

console.log('✅ All integration test files processed!');
