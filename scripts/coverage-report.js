#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function runCommand(command, cwd) {
  try {
    log(`Running: ${command}`, colors.cyan);
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (error) {
    log(`Failed to run: ${command}`, colors.red);
    return false;
  }
}

function generateCoverageReport() {
  log('\n🔍 Family Board - Code Coverage Report\n', colors.bright);
  
  const rootDir = process.cwd();
  const coverageDir = path.join(rootDir, 'coverage');
  
  // Create coverage directory
  ensureDirectory(coverageDir);
  
  // Track results
  const results = {
    backend: { success: false, path: '' },
    frontend: { success: false, path: '' },
  };
  
  // Backend coverage
  log('\n📦 Backend Coverage\n', colors.bright + colors.green);
  const backendDir = path.join(rootDir, 'backend');
  if (fs.existsSync(backendDir)) {
    // First install dependencies if needed
    runCommand('npm install', backendDir);
    
    // Run backend coverage
    if (runCommand('npm run test:coverage', backendDir)) {
      results.backend.success = true;
      results.backend.path = path.join(backendDir, 'coverage');
      
      // Copy backend coverage to root
      const backendCoverageDir = path.join(coverageDir, 'backend');
      ensureDirectory(backendCoverageDir);
      
      try {
        execSync(`cp -r ${results.backend.path}/* ${backendCoverageDir}/`, { stdio: 'ignore' });
        log('✅ Backend coverage report generated', colors.green);
      } catch (e) {
        log('⚠️  Could not copy backend coverage report', colors.yellow);
      }
    } else {
      log('❌ Backend coverage failed', colors.red);
    }
  }
  
  // Frontend coverage
  log('\n🎨 Frontend Coverage\n', colors.bright + colors.green);
  const frontendDir = path.join(rootDir, 'frontend');
  if (fs.existsSync(frontendDir)) {
    // First install dependencies if needed
    runCommand('npm install', frontendDir);
    
    // Run frontend coverage
    if (runCommand('npm run test:coverage', frontendDir)) {
      results.frontend.success = true;
      results.frontend.path = path.join(frontendDir, 'coverage');
      
      // Copy frontend coverage to root
      const frontendCoverageDir = path.join(coverageDir, 'frontend');
      ensureDirectory(frontendCoverageDir);
      
      try {
        execSync(`cp -r ${results.frontend.path}/* ${frontendCoverageDir}/`, { stdio: 'ignore' });
        log('✅ Frontend coverage report generated', colors.green);
      } catch (e) {
        log('⚠️  Could not copy frontend coverage report', colors.yellow);
      }
    } else {
      log('❌ Frontend coverage failed', colors.red);
    }
  }
  
  // Generate summary
  log('\n📊 Coverage Summary\n', colors.bright + colors.cyan);
  
  if (results.backend.success || results.frontend.success) {
    log('Coverage reports have been generated:', colors.green);
    
    if (results.backend.success) {
      log(`  - Backend:  ${path.join(coverageDir, 'backend', 'index.html')}`, colors.green);
    }
    
    if (results.frontend.success) {
      log(`  - Frontend: ${path.join(coverageDir, 'frontend', 'index.html')}`, colors.green);
    }
    
    // Create a simple HTML index that links to both reports
    const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Family Board - Code Coverage Reports</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background-color: #f5f5f5;
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .reports {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }
        .report-card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .report-card h2 {
            color: #666;
            margin-top: 0;
        }
        .report-card a {
            display: inline-block;
            margin-top: 1rem;
            padding: 0.5rem 1rem;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        .report-card a:hover {
            background-color: #0056b3;
        }
        .unavailable {
            opacity: 0.5;
        }
        .unavailable a {
            background-color: #ccc;
            cursor: not-allowed;
        }
        .timestamp {
            text-align: center;
            color: #666;
            margin-top: 2rem;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <h1>Family Board - Code Coverage Reports</h1>
    <div class="reports">
        <div class="report-card ${results.backend.success ? '' : 'unavailable'}">
            <h2>Backend Coverage</h2>
            <p>Jest test coverage for the Node.js backend</p>
            ${results.backend.success 
              ? '<a href="backend/index.html">View Report</a>' 
              : '<a href="#">Not Available</a>'
            }
        </div>
        <div class="report-card ${results.frontend.success ? '' : 'unavailable'}">
            <h2>Frontend Coverage</h2>
            <p>Vitest coverage for the React frontend</p>
            ${results.frontend.success 
              ? '<a href="frontend/index.html">View Report</a>' 
              : '<a href="#">Not Available</a>'
            }
        </div>
    </div>
    <div class="timestamp">
        Generated on ${new Date().toLocaleString()}
    </div>
</body>
</html>
`;
    
    fs.writeFileSync(path.join(coverageDir, 'index.html'), indexHtml);
    log(`\n🎉 Unified coverage report: ${path.join(coverageDir, 'index.html')}`, colors.bright + colors.green);
  } else {
    log('\n❌ No coverage reports were generated successfully', colors.red);
  }
}

// Run the coverage report generation
generateCoverageReport();