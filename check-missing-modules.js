#!/usr/bin/env node

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

console.log('🔍 Checking for missing modules in built app...\n');

// Check what modules are actually in the asar
try {
  console.log('📦 Checking asar contents for missing modules...');
  
  // Check if file-uri-to-path is in asar
  try {
    const result = execSync('npx asar list "release/0.0.0/win-unpacked/resources/app.asar" | findstr "file-uri-to-path"', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (result.trim()) {
      console.log('✅ file-uri-to-path found in asar');
    } else {
      console.log('❌ file-uri-to-path NOT found in asar');
    }
  } catch (e) {
    console.log('❌ file-uri-to-path NOT found in asar');
  }
  
  // Check if file-uri-to-path is in unpacked
  try {
    const unpackedResult = execSync('dir "release/0.0.0/win-unpacked/resources/app.asar.unpacked" /s /b | findstr "file-uri-to-path"', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (unpackedResult.trim()) {
      console.log('✅ file-uri-to-path found in unpacked files');
    } else {
      console.log('❌ file-uri-to-path NOT found in unpacked files');
    }
  } catch (e) {
    console.log('❌ file-uri-to-path NOT found in unpacked files');
  }
  
  // Check what bindings.js is trying to require
  try {
    const bindingsContent = execSync('npx asar extract-file "release/0.0.0/win-unpacked/resources/app.asar" "node_modules/bindings/bindings.js" temp_bindings.js', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('📄 Checking bindings.js content...');
    const content = readFileSync('temp_bindings.js', 'utf8');
    
    if (content.includes('file-uri-to-path')) {
      console.log('✅ bindings.js references file-uri-to-path');
    } else {
      console.log('❌ bindings.js does NOT reference file-uri-to-path');
    }
    
    // Clean up
    execSync('del temp_bindings.js', { stdio: 'pipe' });
  } catch (e) {
    console.log('❌ Could not check bindings.js content');
  }
  
} catch (e) {
  console.log('❌ Error checking modules:', e.message);
}

console.log('\n📋 Module check completed!');
