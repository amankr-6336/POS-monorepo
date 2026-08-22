import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { useAuthStore } from "./store/useAuthStore";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tables from "./pages/Tables";
import MenuManagement from "./pages/MenuManagement";
import KDS from "./pages/KDS";
import Orders from "./pages/Orders";
import Ratings from "./pages/Ratings";
import { LayoutDashboard, TableProperties, ChefHat, ClipboardList, BookOpen, LogOut, Star } from "lucide-react";
import { SOCKET_URL } from "./config";

// Route guard for authenticated staff
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.accessToken);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

// Sidebar layout wrapper
function Layout() {
  const { user, clearAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.restaurantId) return;
    const socket = io(SOCKET_URL);
    socket.emit("join-restaurant", user.restaurantId);

    socket.on("rating:lowRatingAlert", (data: any) => {
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav");
        audio.play();
      } catch (e) {}
      alert(`⚠️ LOW RATING ALERT: ${data.tableLabel} submitted a rating of ${data.overallRating} stars!\nComment: "${data.comment || 'No comment'}"`);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.restaurantId]);

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const navLinks = [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: "/tables", label: "Tables", icon: <TableProperties className="w-4 h-4" /> },
    { to: "/menu-management", label: "Menu & Stock", icon: <BookOpen className="w-4 h-4" /> },
    { to: "/orders", label: "Orders & Bills", icon: <ClipboardList className="w-4 h-4" /> },
    { to: "/ratings", label: "Ratings & Reviews", icon: <Star className="w-4 h-4" /> },
    { to: "/kds", label: "KDS Screen", icon: <ChefHat className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100">
      {/* Sidebar - Hidden on print */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between p-6 no-print shrink-0">
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Gourmet POS</h2>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Admin Console</span>
          </div>

          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    active
                      ? "bg-violet-600 text-white shadow-md shadow-violet-600/10"
                      : "text-zinc-400 hover:bg-zinc-850 hover:text-white"
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User logout footer */}
        <div className="pt-6 border-t border-zinc-800 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white truncate max-w-[120px]">{user?.name}</h4>
            <span className="text-[10px] text-zinc-500 capitalize">{user?.role}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main viewport */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/menu-management" element={<MenuManagement />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/ratings" element={<Ratings />} />
          <Route path="/kds" element={<KDS />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
