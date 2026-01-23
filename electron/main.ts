/**
 * Polyfill Node.js globals for ESM compatibility
 * This fixes the "__filename is not defined" error from better-sqlite3
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

// Polyfill __filename and __dirname for CommonJS modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make these available globally for CommonJS modules
(global as any).__filename = __filename;
(global as any).__dirname = __dirname;

import { app, BrowserWindow } from "electron";
import { setupHandlers } from "./handlers";

// In dev, we still rely on process.cwd() for APP_ROOT, but any path joins should
// use the reconstructed __dirname when they are relative to the current file.
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const APP_ROOT = VITE_DEV_SERVER_URL ? process.cwd() : app.getAppPath();
process.env.APP_ROOT = APP_ROOT;

export const MAIN_DIST = path.join(APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(__dirname, "../public")
  : RENDERER_DIST;

let win: BrowserWindow | null;
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Promise Rejection at:", promise, "reason:", reason);
  console.error("❌ Rejection details:", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    timestamp: new Date().toISOString()
  });
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  console.error("❌ Exception details:", {
    message: err.message,
    stack: err.stack,
    name: err.name,
    timestamp: new Date().toISOString()
  });
});

function createWindow() {
  console.log("Creating window...");
  console.log("RENDERER_DIST:", RENDERER_DIST);
  console.log("VITE_DEV_SERVER_URL:", VITE_DEV_SERVER_URL);

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    icon: path.join(process.env.VITE_PUBLIC ?? "", "electron-vite.svg"),
    webPreferences: {
      preload: path.join(MAIN_DIST, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  });

  win.setMenu(null);

  // Load content
  if (VITE_DEV_SERVER_URL) {
    console.log("Loading dev server URL:", VITE_DEV_SERVER_URL);
    win.loadURL(VITE_DEV_SERVER_URL).catch((err) => {
      console.error("Failed to load dev URL:", err);
    });
    // Open devtools in dev mode
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(RENDERER_DIST, "index.html");
    console.log("Loading file:", indexPath);
    win.loadFile(indexPath).catch((err) => {
      console.error("Failed to load file:", err);
    });
  }

  // Error handlers
  win.webContents.on("render-process-gone" as any, (event) => {
    console.error("Render process gone", event);
  });

  win.webContents.on("unresponsive" as any, () => {
    console.warn("WebContents unresponsive");
  });

  win.webContents.on("did-fail-load", (_, errorCode, errorDescription) => {
    console.error("Failed to load:", errorCode, errorDescription);
  });

  // Show window when ready
  win.webContents.on("did-finish-load", () => {
    console.log("Content loaded, showing window");
    win?.webContents.send("main-process-message", new Date().toLocaleString());
    win?.show();
  });

  // Show window after a timeout if content hasn't loaded
  setTimeout(() => {
    if (win && !win.isVisible()) {
      console.log("Timeout: forcing window to show");
      win.show();
    }
  }, 3000);
}

app.on("window-all-closed", () => {
  // Clear session when app closes
  win?.webContents.send("auth:session-cleared");
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("before-quit", () => {
  // Clear session when app is about to quit
  win?.webContents.send("auth:session-cleared");
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handler for bill printing is in handlers.ts
app
  .whenReady()
  .then(async () => {
    try {
      console.log("🚀 App is ready, setting up handlers...");
      await setupHandlers();
      console.log("✅ Handlers setup completed");
      createWindow();
    } catch (err) {
      console.error("❌ setupHandlers() failed during initialization:", err);
      console.error("❌ Initialization error details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString()
      });
      // Still create window even if handlers fail to allow debugging
      createWindow();
    }
  })
  .catch((err) => {
    console.error("❌ whenReady failed:", err);
    console.error("❌ App ready error details:", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      timestamp: new Date().toISOString()
    });
  });

app.on("quit", () => {
  console.log("App quitting");
});
