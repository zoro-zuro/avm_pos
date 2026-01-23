# AVM POS

**Design/Idea**: [Excalidraw Link](https://excalidraw.com/#json=r8FUc-xksbc-CJ4_7i1Nh,QHg6MFXHuPwzIZn6wgnGqA)

---

# 🛠️ Build & Packaging Guide (Critical Reference)

This project uses a specialized stack: **Electron + Vite + React + pnpm**. Due to the nature of Electron's bundling and pnpm's strict dependency management, follow these guidelines **exactly** to avoid build failures or runtime "Module not found" errors.

## ⚠️ The Golden Rules

1.  **Always use Hoisted Node Modules**
    This project contains a `.npmrc` file in the root with `node-linker=hoisted`.
    *   **Why?** Electron-builder cannot follow pnpm's default symlinked nested structure. Hoisted mode flattens `node_modules`, making it look like a standard npm/yarn install, which Electron loves.
    *   **Never delete** this `.npmrc` file.

2.  **Main Process is ESM (EcmaScript Modules)**
    *   The `electron/main.ts` is treated as a module (`"type": "module"` in package.json).
    *   **You cannot use global `require(...)` directly.**
    *   If you need to require a CommonJS module (like `bcrypt` or `electron-pos-printer`), use the polyfill:
        ```ts
        import { createRequire } from "node:module";
        const require = createRequire(import.meta.url);
        const myLib = require("my-lib");
        ```

---

## 📦 How to Install New Packages

### Scenario A: Regular UI Library (React components, utilities)
Examples: `lodash`, `framer-motion`, `axios`.

1.  Run: `pnpm add package-name`
2.  Use it in your React components (`src/`) as usual.
3.  **No config changes needed.**

### Scenario B: Native Modules (Database, System, Encryption) 🚨
Examples: `better-sqlite3`, `bcrypt`, `serialport`, `node-gyp-build`.
**These cause 99% of build errors. Follow these steps carefully:**

1.  **Install**:
    ```bash
    pnpm add package-name
    ```
2.  **Mark as External in Vite**:
    Open `vite.config.ts`. Add the package name to the `external` list in the `electron.main` section.
    ```ts
    // vite.config.ts
    external: [
      "better-sqlite3",
      "bcrypt",
      "your-new-package" // <-- Add here
    ]
    ```
    *Why?* Vite tries to bundle everything into one file. Native modules cannot be bundled; they must remain as separate folders on the disk.

3.  **Unpack in Electron Builder**:
    Open `electron-builder.json5`. Add the package and its dependencies to `asarUnpack`.
    ```json5
    // electron-builder.json5
    asarUnpack: [
      "**/*.node",
      "**/node_modules/better-sqlite3/**",
      "**/node_modules/bcrypt/**",
      "**/node_modules/your-new-package/**" // <-- Add here
    ]
    ```
    *Why?* The specific `.node` binary files must be extracted from the compressed `app.asar` archive to run on Windows.

---

## 🚀 How to Build & Release

Always use the dedicated release script.

1.  **Clean & Reinstall (If you added new packages)**:
    If you just added packages, it is safest to ensure the hoisted structure is clean.
    ```powershell
    rm node_modules -r -fo
    pnpm install
    ```

2.  **Build**:
    ```powershell
    pnpm run build:release
    ```
    *This script performs:*
    *   `typescript` check
    *   `vite build` (React + Main)
    *   `rebuild:electron` (Compiles native modules for Electron version)
    *   `electron-builder` (Packages the .exe)

3.  **Output**:
    The installer and unpacked executable will be in:
    `d:\avm_pos\release\X.X.X\`

---

## 🔧 Troubleshooting Common Errors

### 1. `Error: Cannot find module 'xyz'` at runtime
*   **Cause**: The module was bundled by Vite (bad) OR not unpacked by Electron Builder (bad).
*   **Fix**:
    1.  Check `vite.config.ts`: Is it in `external`?
    2.  Check `electron-builder.json5`: Is it in `asarUnpack`?
    3.  Did you run `pnpm install` with `.npmrc` present?

### 2. `ReferenceError: require is not defined`
*   **Cause**: You used `require('...')` in `main.ts` without `createRequire`.
*   **Fix**:
    ```ts
    import { createRequire } from "node:module";
    const require = createRequire(import.meta.url);
    ```

### 3. `Module did not self-register` or `DLL load failed`
*   **Cause**: The native module was compiled for Node.js, not Electron.
*   **Fix**:
    Force a rebuild against the Electron headers:
    ```powershell
    pnpm run rebuild:electron
    ```
