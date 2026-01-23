[33mcommit 9ac6b5747b6b3c87163b4c982f2604178b59d748[m[33m ([m[1;36mHEAD[m[33m -> [m[1;32mmain[m[33m, [m[1;31morigin/main[m[33m, [m[1;31morigin/HEAD[m[33m)[m
Author: Sheik <yasinnew72@gmail.com>
Date:   Mon Jan 19 14:23:48 2026 +0530

    fix: fix __filename error and TypeScript event type issues
    
    - Removed non-existent __filename reference (not available in ES modules)
    - Changed 'crashed' event to 'render-process-gone' (correct event name)
    - Added 'as any' cast for non-standard events to bypass TypeScript strictness
    - This fixes the ReferenceError and TypeScript compilation errors in pnpm dev

[1mdiff --git a/electron/main.ts b/electron/main.ts[m
[1mindex e2e4d54..880196b 100644[m
[1m--- a/electron/main.ts[m
[1m+++ b/electron/main.ts[m
[36m@@ -54,11 +54,11 @@[m [mfunction createWindow() {[m
   }[m
 [m
   // Error handlers[m
[31m-  win.webContents.on("crashed", () => {[m
[31m-    console.error("WebContents crashed");[m
[32m+[m[32m  win.webContents.on("render-process-gone" as any, (event) => {[m
[32m+[m[32m    console.error("Render process gone", event);[m
   });[m
 [m
[31m-  win.webContents.on("unresponsive", () => {[m
[32m+[m[32m  win.webContents.on("unresponsive" as any, () => {[m
     console.warn("WebContents unresponsive");[m
   });[m
 [m
