// General test setup that determines which specific setup to use
const testFile = expect.getState().testPath || '';

if (testFile.includes('/unit/')) {
  // Unit test setup - no database connection
  require('./unit-setup');
} else if (testFile.includes('/integration/')) {
  // Integration test setup - with database connection
  require('./integration-setup');
} else {
  // Default setup for any other tests
  const { initI18n } = require('../config/i18n');
  
  beforeAll(async () => {
    process.env['JWT_SECRET'] = 'test-jwt-secret';
    process.env['NODE_ENV'] = 'test';
    await initI18n();
  });
} 