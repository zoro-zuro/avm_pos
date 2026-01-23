#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('🔍 Finding the EXACT missing module...\n');

// Run the app and capture the error
try {
  console.log('🚀 Starting app to capture error...');
  const result = execSync('cd "release/0.0.0/win-unpacked" && "AVM POS.exe" 2>&1', { 
    encoding: 'utf8', 
    timeout: 3000,
    stdio: 'pipe'
  });
  
  console.log('STDOUT:', result);
} catch (error) {
  console.log('\n❌ CAPTURED ERROR:');
  console.log('==================');
  console.log(error.message);
  
  if (error.stdout) {
    console.log('\n📄 STDOUT:');
    console.log(error.stdout);
  }
  
  if (error.stderr) {
    console.log('\n📄 STDERR:');
    console.log(error.stderr);
  }
  
  // Extract the missing module name
  const errorText = error.message + (error.stderr || '');
  const moduleMatch = errorText.match(/Cannot find module '([^']+)'/);
  
  if (moduleMatch) {
    const missingModule = moduleMatch[1];
    console.log('\n🎯 MISSING MODULE IDENTIFIED:');
    console.log(`"${missingModule}"`);
    console.log('\n📋 SOLUTION:');
    console.log(`1. Install: pnpm add ${missingModule}`);
    console.log(`2. Add to vite.config.ts external: ["${missingModule}"]`);
    console.log(`3. Add to electron-builder.json5 asarUnpack: ["**/${missingModule}/**"]`);
  } else {
    console.log('\n❌ Could not identify missing module from error');
  }
}

console.log('\n📋 Analysis completed!');
