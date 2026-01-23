#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🧪 Testing built app...\n');

// Check if built app exists
const appPath = 'release/0.0.0/win-unpacked/AVM POS.exe';
if (!existsSync(appPath)) {
  console.log('❌ Built app not found. Run "pnpm build:release" first.');
  process.exit(1);
}

console.log('✅ Built app found');

// Test the app by running it briefly
try {
  console.log('🚀 Starting built app...');
  const child = execSync(`"${appPath}"`, { 
    encoding: 'utf8', 
    timeout: 10000, // 10 seconds
    stdio: 'pipe'
  });
  
  console.log('✅ App started successfully');
  console.log('✅ No immediate errors detected');
} catch (error) {
  if (error.signal === 'SIGTERM') {
    console.log('✅ App started successfully (terminated after test)');
  } else {
    console.log('❌ Error running built app:');
    console.log(error.message);
    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.log('STDERR:', error.stderr);
    process.exit(1);
  }
}

console.log('\n🎉 Built app test completed successfully!');
