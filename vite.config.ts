import { defineConfig } from "vite";
// import electron from "vite-plugin-electron/simple";
import path from "node:path";
import { fileURLToPath } from "node:url";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * IMPORTANT:
 * When Vite is running in ESM mode ("type": "module" in [package.json](VALID_FILE)),
 * Node does not define the CommonJS globals __filename and __dirname.
 * We must reconstruct them using import.meta.url + fileURLToPath.
 *
 * This code must live in your *config* file, not in the Electron main
 * bundle, so it won't cause "__filename is not defined" at runtime.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    electron({
      main: {
        entry: "electron/main.ts",
        vite: {
          build: {
            rollupOptions: {
              /**
               * Keep these as external so they are not bundled into the
               * ESM main output. In particular, electron-pos-printer is
               * CommonJS and must be required at runtime via createRequire
               * inside handlers.ts (see setupHandlers / print-bill IPC).
               */
              external: [
                "electron-pos-printer",
                "",
                "electron",
                "path",
                "fs",
                "url",
                "better-sqlite3",
                "drizzle-orm",
                "bcrypt",
              ],
            },
          },
        },
      },
      preload: { input: path.join(__dirname, "electron/preload.ts") },
      renderer: process.env.NODE_ENV === "test" ? undefined : {},
    }),
  ],
});
