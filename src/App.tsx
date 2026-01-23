import { useState, useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import AuthPage from "./pages/Auth";
import POSPage from "./pages/Pos";
import InventoryPage from "./pages/Inventory";
import DashboardPage from "./pages/Dashboard";
import AdminSalesReportPage from "./pages/SalesReport";
import SettingsPage, { SettingsUser } from "./pages/Settings";
import CreateProductPage from "./pages/CreatProd";
import AppLayout from "./AppLayout";
import { USER } from "./lib/User";

interface User {
  id: number;
  name: string;
  role: "admin" | "staff" | "manager";
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = USER.read<User>();
    if (savedUser) setUser(savedUser);
    setLoading(false);
  }, []);

  const handleLogout = () => {
    setUser(null);
    USER.clear();
  };

  const ProtectedRoute = ({
    children,
    allowedRoles,
  }: {
    children: React.ReactNode;
    allowedRoles: string[];
  }) => {
    if (loading) {
      return (
        <div className="h-screen flex items-center justify-center">
          Loading...
        </div>
      );
    }
    if (!user) return <Navigate to="/" replace />;
    if (!allowedRoles.includes(user.role)) {
      return (
        <div className="h-screen flex items-center justify-center bg-red-50">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-red-600">Access Denied</h1>
            <p className="text-gray-600 mt-2">
              You don't have permission to access this page.
            </p>
            <button
              onClick={handleLogout}
              className="mt-4 bg-orange text-white px-6 py-2 rounded-lg font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      );
    }
    return <>{children}</>;
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );

  return (
    <Router>
      <Routes>
        {/* Auth */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthPage
                onLogin={(u) => {
                  setUser(u);
                  USER.write(u);
                }}
              />
            )
          }
        />

        {/* All app pages (global navbar) */}
        <Route element={<AppLayout user={user} onLogout={handleLogout} />}>
          <Route
            path="/pos"
            element={
              <ProtectedRoute allowedRoles={["admin", "staff", "manager"]}>
                <POSPage user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute allowedRoles={["admin", "staff", "manager"]}>
                <InventoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin", "staff", "manager"]}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sales-report"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminSalesReportPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/create-product"
            element={
              <ProtectedRoute allowedRoles={["admin", "staff", "manager"]}>
                <CreateProductPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={["admin", "staff", "manager"]}>
                <SettingsPage user={user as SettingsUser} />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
