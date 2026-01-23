import { Outlet } from "react-router-dom";
import Navbar from "./components/Nav";
import { useEffect, useState } from "react";

type User = { id: number; name: string; role: "admin" | "staff" | "manager" };
type DeviceStatus = "connected" | "disconnected" | "unknown";

export default function AppLayout({
  user,
  onLogout,
}: {
  user: User | null;
  onLogout: () => void;
}) {
  const [printerStatus, setPrinterStatus] = useState<DeviceStatus>("unknown");
  const [scannerStatus, setScannerStatus] = useState<DeviceStatus>("unknown");

  useEffect(() => {
    // Check printer and scanner status on mount
    const checkDevices = async () => {
      try {
        const printerRes = await (window.api as any)?.checkPrinterStatus?.();
        if (printerRes?.success) {
          const status = printerRes.status as DeviceStatus;
          setPrinterStatus(status);
        }
      } catch (err) {
        console.error("Error checking printer:", err);
      }

      try {
        const scannerRes = await (window.api as any)?.checkScannerStatus?.();
        if (scannerRes?.success) {
          const status = scannerRes.status as DeviceStatus;
          setScannerStatus(status);
        }
      } catch (err) {
        console.error("Error checking scanner:", err);
      }
    };

    checkDevices();
    // Re-check every 5 seconds
    const interval = setInterval(checkDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Navbar
        mode="dashboard"
        printerStatus={printerStatus}
        scannerStatus={scannerStatus}
        onLogout={onLogout}
        user={user}
      />
      <Outlet />
    </>
  );
}
