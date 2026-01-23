// preload.ts
import { contextBridge, ipcRenderer } from "electron";

type BillItem = { name: string; qty: number; price: number };
type BillPayload = {
  storeName: string;
  address: string;
  phone: string;
  billNo: string;
  dateTime: string;
  items: BillItem[];
  total: number;
  paymentMode: string;
};

const api = {
  // Auth
  checkInit: () => ipcRenderer.invoke("auth:check-init"),
  setupAdmin: (data: any) => ipcRenderer.invoke("auth:setup-admin", data),
  login: (data: any) => ipcRenderer.invoke("auth:login", data),
  logout: () => ipcRenderer.invoke("auth:logout"),
  checkSession: () => ipcRenderer.invoke("auth:check-session"),

  // Master data
  getCategories: () => ipcRenderer.invoke("categories:getAll"),
  getProducts: () => ipcRenderer.invoke("products:getAll"),
  getSuppliers: () => ipcRenderer.invoke("suppliers:getAll"),
  barcodeExists: (barcode: string) =>
    ipcRenderer.invoke("products:barcodeExists", { barcode }),

  // Receipts / POS
  getReceipts: () => ipcRenderer.invoke("receipts:getAll"),
  getReceiptsRange: (from: string, to: string) =>
    ipcRenderer.invoke("receipts:getRange", { from, to }),
  createReceipt: (data: any) => ipcRenderer.invoke("receipts:add", data),
  checkout: (data: any) => ipcRenderer.invoke("pos:checkout", data),

  // Logs
  getLogsRange: (from: string, to: string) =>
    ipcRenderer.invoke("logs:getRange", { from, to }),

  // Reports
  getTodayDashboard: () => ipcRenderer.invoke("reports:todayDashboard"),
  getSalesRange: (from: string, to: string) =>
    ipcRenderer.invoke("reports:salesRange", { from, to }),

  // Settings
  getSettings: () => ipcRenderer.invoke("settings:getAll"),
  setSettingsMany: (currentUserId: number, values: Record<string, string>) =>
    ipcRenderer.invoke("settings:setMany", { currentUserId, values }),

  // Generic invoke
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),

  // Bill printing
  printBill: (payload: BillPayload) => ipcRenderer.send("print-bill", payload),
  onPrintSuccess: (cb: () => void) => {
    ipcRenderer.on("print-bill:success", cb);
    return () => ipcRenderer.removeListener("print-bill:success", cb);
  },
  onPrintError: (cb: (event: any, msg: string) => void) => {
    ipcRenderer.on("print-bill:error", cb);
    return () => ipcRenderer.removeListener("print-bill:error", cb);
  },

  reportScannerActivity: () => ipcRenderer.invoke("devices:reportScannerActivity"),

  // Device status
  checkPrinterStatus: () => ipcRenderer.invoke("devices:checkPrinter"),
  checkScannerStatus: () => ipcRenderer.invoke("devices:checkScanner"),
};

contextBridge.exposeInMainWorld("api", api);
