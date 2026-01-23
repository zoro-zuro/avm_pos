#!/usr/bin/env node
import { readFileSync } from "fs";
import { execSync } from "child_process";

console.log("🔍 Checking for build errors...\n");

const errors = [];

function fileIncludesAny(path, needles) {
  const content = readFileSync(path, "utf8");
  return needles.some((n) => content.includes(n));
}

// 1) Check renderer/main imports of bcrypt (basic)
console.log("1️⃣ Checking for bcrypt imports/requires in electron/** ...");
try {
  // findstr exit codes: 0 match, 1 no match, 2 error [web:185][web:187]
  const cmd =
    'findstr /s /i /r "import.*bcrypt\\|from.*bcrypt\\|require(.*bcrypt\\)" electron\\*.ts electron\\*.js';
  const result = execSync(cmd, { encoding: "utf8" });

  if (result.trim()) {
    errors.push("❌ bcrypt import/require found in electron files:\n" + result);
  } else {
    console.log("✅ No bcrypt imports/requires found");
  }
} catch (e) {
  // Exit code 1 = no matches (OK) [web:185]
  console.log("✅ No bcrypt imports/requires found");
}

// 2) createRequire usage
console.log("\n2️⃣ Checking createRequire usage...");
try {
  const handlersContent = readFileSync("electron/handlers.ts", "utf8");
  const bootstrapContent = readFileSync("electron/bootstrap.ts", "utf8");

  const handlersOk = handlersContent.includes("createRequire");
  const bootstrapOk = bootstrapContent.includes("createRequire");

  if (!handlersOk) errors.push("❌ handlers.ts missing createRequire");
  if (!bootstrapOk) errors.push("❌ bootstrap.ts missing createRequire");

  if (handlersOk && bootstrapOk) console.log("✅ createRequire found in both files");
} catch (e) {
  errors.push("❌ Error checking createRequire: " + e.message);
}

// 3) Vite config external modules
console.log("\n3️⃣ Checking vite config...");
try {
  const viteConfig = readFileSync("vite.config.ts", "utf8");

  const hasBcryptExternal =
    viteConfig.includes('"bcrypt"') || viteConfig.includes("'bcrypt'");
  if (!hasBcryptExternal) {
    errors.push("❌ bcrypt missing from vite config externals");
  }

  if (viteConfig.includes('""') || viteConfig.includes("''")) {
    errors.push("❌ Empty string found in vite config (possible typo)");
  }

  if (errors.filter((e) => e.includes("vite config")).length === 0) {
    console.log("✅ Vite config looks good");
  }
} catch (e) {
  errors.push("❌ Error checking vite config: " + e.message);
}

// 4) electron-builder config
console.log("\n4️⃣ Checking electron-builder config...");
try {
  const builderConfig = readFileSync("electron-builder.json5", "utf8");

  const bcryptOk = builderConfig.includes("**/bcrypt/**") || builderConfig.includes("node_modules/bcrypt/**");
  const sqliteOk = builderConfig.includes("**/better-sqlite3/**") || builderConfig.includes("node_modules/better-sqlite3/**");
  const gypOk = builderConfig.includes("**/node-gyp-build/**") || builderConfig.includes("node_modules/node-gyp-build/**");
  const nodeBinaryOk = builderConfig.includes("**/*.node");

  if (!nodeBinaryOk) errors.push("❌ Missing **/*.node in asarUnpack");
  if (!bcryptOk) errors.push("❌ bcrypt missing from electron-builder asarUnpack");
  if (!sqliteOk) errors.push("❌ better-sqlite3 missing from electron-builder asarUnpack");
  if (!gypOk) errors.push("❌ node-gyp-build missing from electron-builder asarUnpack");

  if (!errors.some((e) => e.includes("asarUnpack"))) {
    console.log("✅ Electron-builder config looks good");
  }
} catch (e) {
  errors.push("❌ Error checking electron-builder config: " + e.message);
}

// 5) Package exports
console.log("\n5️⃣ Checking package exports...");
try {
  const bootstrapContent = readFileSync("electron/bootstrap.ts", "utf8");
  if (!bootstrapContent.includes("export async function seedDbIfEmpty")) {
    errors.push("❌ seedDbIfEmpty not exported in bootstrap.ts");
  } else {
    console.log("✅ Package exports look good");
  }
} catch (e) {
  errors.push("❌ Error checking package exports: " + e.message);
}

// Results
console.log("\n" + "=".repeat(50));
if (errors.length === 0) {
  console.log("🎉 ALL CHECKS PASSED! No build errors detected.");
  console.log("✅ Safe to build the release version.");
  process.exit(0);
} else {
  console.log("❌ BUILD ERRORS FOUND:");
  errors.forEach((error, index) => console.log(`\n${index + 1}. ${error}`));
  console.log("\n⚠️  Fix these errors before building!");
  process.exit(1);
}
