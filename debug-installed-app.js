#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

console.log('🔍 Debugging installed app...\n');

// Check if installer exists
const installerPath = 'release/0.0.0/AVM POS-Windows-0.0.0-Setup.exe';
if (!existsSync(installerPath)) {
  console.log('❌ Installer not found. Run "pnpm build:release" first.');
  process.exit(1);
}

console.log('✅ Installer found');

// Check built app files
const appExePath = 'release/0.0.0/win-unpacked/AVM POS.exe';
const appAsarPath = 'release/0.0.0/win-unpacked/resources/app.asar';

console.log('\n📁 Checking built app files...');
console.log(`✅ EXE exists: ${existsSync(appExePath)}`);
console.log(`✅ ASAR exists: ${existsSync(appAsarPath)}`);

// Check if bcrypt is properly included
console.log('\n🔍 Checking bcrypt inclusion...');
try {
  // List contents of asar to see if bcrypt is included
  const result = execSync('npx asar list "release/0.0.0/win-unpacked/resources/app.asar" | findstr bcrypt', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  if (result.trim()) {
    console.log('✅ bcrypt found in asar:');
    console.log(result);
  } else {
    console.log('❌ bcrypt NOT found in asar');
  }
} catch (e) {
  console.log('⚠️  Could not check asar contents (npx asar might not be installed)');
}

// Check unpacked files
console.log('\n📦 Checking unpacked files...');
try {
  const unpackedPath = 'release/0.0.0/win-unpacked/resources/app.asar.unpacked';
  if (existsSync(unpackedPath)) {
    console.log('✅ Unpacked directory exists');
    
    // Check for bcrypt in unpacked
    try {
      const bcryptResult = execSync(`dir "${unpackedPath}" /s /b | findstr bcrypt`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (bcryptResult.trim()) {
        console.log('✅ bcrypt found in unpacked files:');
        console.log(bcryptResult);
      } else {
        console.log('❌ bcrypt NOT found in unpacked files');
      }
    } catch (e) {
      console.log('❌ bcrypt NOT found in unpacked files');
    }
  } else {
    console.log('❌ Unpacked directory does not exist');
  }
} catch (e) {
  console.log('❌ Error checking unpacked files:', e.message);
}

// Try to run the app with error capture
console.log('\n🚀 Testing app startup with error capture...');
try {
  console.log('Starting app... (will run for 5 seconds)');
  
  const child = execSync(`".\\${appExePath}"`, { 
    encoding: 'utf8', 
    timeout: 5000,
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: 'release/0.0.0/win-unpacked',
    shell: true
  });
  
  console.log('STDOUT:', child);
} catch (error) {
  console.log('\n❌ APP ERROR CAPTURED:');
  console.log('Error message:', error.message);
  console.log('Error code:', error.status);
  
  if (error.stdout) {
    console.log('\nSTDOUT:');
    console.log(error.stdout);
  }
  
  if (error.stderr) {
    console.log('\nSTDERR:');
    console.log(error.stderr);
  }
  
  if (error.signal === 'SIGTERM') {
    console.log('\n✅ App was terminated (this is normal for timeout test)');
  }
}

console.log('\n📋 Debug completed!');
