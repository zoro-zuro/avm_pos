import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, ArrowRight, ShieldCheck } from "lucide-react";

interface AuthPageProps {
  onLogin: (user: {
    id: number;
    name: string;
    role: "admin" | "staff" | "manager";
  }) => void;
}



export default function AuthPage({ onLogin }: AuthPageProps) {
  const [isSetup, setIsSetup] = useState(false); // means: needs setup
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ name: "", password: "" });
  const navigate = useNavigate();

  // Check if system needs setup
  useEffect(() => {
    let alive = true;

    const check = async () => {
      try {
        const res = await window.api?.checkInit?.(); // invokes auth:check-init [web:634]
        if (!alive) return;

        if (!res?.success) {
          setError(res?.error ?? "Failed to check system status");
          setIsSetup(false);
        } else {
          const isInit = !!res.isInit; // handler meaning: initialized? (has users)
          const needsSetup = !isInit; // UI meaning: show setup form?
          setIsSetup(needsSetup);
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to check system status");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    check();
    return () => {
      alive = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      if (isSetup) {
        // Setup Admin
        const res = await window.api?.setupAdmin?.(formData);
        if (res?.success) {
          setFormData({ name: "", password: "" });

          // Re-check init after creating admin
          const initRes = await window.api?.checkInit?.();
          const isInit = !!initRes?.success && !!initRes.isInit;
          setIsSetup(!isInit);

          alert("✅ Admin account created! Now login.");
        } else {
          setError(res?.error || "Setup failed");
        }
      } else {
        // Login
        const res = await window.api?.login?.(formData);
        if (res?.success) {
          onLogin(res.user);
          navigate("/dashboard");
        } else {
          setError(res?.error || "Login failed");
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "An error occurred. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-orange-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 text-orange mb-4">
            {isSetup ? <ShieldCheck size={32} /> : <Lock size={32} />}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSetup ? "Setup Admin Account" : "AVM Store POS"}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {isSetup
              ? "Create the master account for your shop"
              : "Login to access your point of sale"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent outline-none transition"
                placeholder={isSetup ? "Choose a username" : "Enter username"}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="password"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent outline-none transition"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
            {isSetup && (
              <p className="text-xs text-gray-500 mt-1">
                Minimum 6 characters recommended
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-orange text-white font-semibold py-3 rounded-lg hover:bg-orange-dark transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl mt-6"
          >
            {isSetup ? "Create Admin Account" : "Login"}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-6 p-3 bg-blue-50 rounded-lg text-xs text-gray-600 border border-blue-100">
          <p className="font-semibold text-blue-900 mb-1">Tip:</p>
          {isSetup
            ? "This is your master account. You can add staff members later from settings."
            : "First time? The system will guide you through setup."}
        </div>
      </div>
    </div>
  );
}
