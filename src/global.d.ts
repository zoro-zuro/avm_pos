// Global type definitions for electron API
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

interface Window {
  api: {
    // Auth
    checkInit: () => Promise<any>;
    setupAdmin: (data: any) => Promise<any>;
    login: (data: any) => Promise<any>;

    // Master data
    getCategories: () => Promise<any>;
    getProducts: () => Promise<any>;
    getSuppliers: () => Promise<any>;
    barcodeExists: (barcode: string) => Promise<any>;

    // Receipts / POS
    getReceipts: () => Promise<any>;
    getReceiptsRange: (from: string, to: string) => Promise<any>;
    createReceipt: (data: any) => Promise<any>;
    checkout: (data: any) => Promise<any>;

    // Logs
    getLogsRange: (from: string, to: string) => Promise<any>;

    // Reports
    getTodayDashboard: () => Promise<any>;
    getSalesRange: (from: string, to: string) => Promise<any>;

    // Settings
    getSettings: () => Promise<any>;
    setSettingsMany: (
      currentUserId: number,
      values: Record<string, string>
    ) => Promise<any>;

    // Generic invoke
    invoke: (channel: string, ...args: any[]) => Promise<any>;

    // Bill printing
    printBill: (payload: BillPayload) => void;
    onPrintSuccess: (cb: () => void) => void;
    onPrintError: (cb: (event: any, msg: string) => void) => void;
  };
}
