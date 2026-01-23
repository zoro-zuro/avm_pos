/// <reference types="vite/client" />

declare global {
  interface Window {
    api?: {
      // Auth
      checkInit: () => Promise<{ success: boolean; isInit?: boolean; error?: string }>;
      setupAdmin: (data: { name: string; password: string }) => Promise<{ success: boolean; error?: string }>;
      login: (data: { name: string; password: string }) => Promise<{ success: boolean; user?: any; error?: string }>;

      // Master data
      getCategories: () => Promise<{ success: boolean; categories?: any[]; error?: string }>;
      getProducts: () => Promise<{ success: boolean; products?: any[]; error?: string }>;
      getSuppliers: () => Promise<{ success: boolean; suppliers?: any[]; error?: string }>;
      barcodeExists: (barcode: string) => Promise<{ success: boolean; exists?: boolean; error?: string }>;

      // POS/Receipts
      getReceipts: () => Promise<{ success: boolean; allRec?: any[]; error?: string }>;
      getReceiptsRange: (from: string, to: string) => Promise<{ success: boolean; receipts?: any[]; error?: string }>;
      createReceipt: (data: any) => Promise<{ success: boolean; receiptId?: number; error?: string }>;
      checkout: (data: any) => Promise<{ success: boolean; receiptId?: number; totalAmount?: number; error?: string }>;

      // Logs / Reports
      getLogsRange: (from: string, to: string) => Promise<{ success: boolean; logs?: any[]; error?: string }>;
      getTodayDashboard: () => Promise<{ success: boolean; metrics?: any; recentReceipts?: any[]; error?: string }>;
      getSalesRange: (from: string, to: string) => Promise<{ success: boolean; receipts?: any[]; logs?: any[]; products?: any[]; categories?: any[]; error?: string }>;

      // Settings
      getSettings: () => Promise<{ success: boolean; settings?: Record<string, string>; error?: string }>;
      setSettingsMany: (currentUserId: number, values: Record<string, string>) => Promise<{ success: boolean; error?: string }>;

      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}

export {};
