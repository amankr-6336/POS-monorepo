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
import AuditLogs from "./pages/AuditLogs";
import { LayoutDashboard, TableProperties, ChefHat, ClipboardList, BookOpen, LogOut, Star, KeyRound, ShieldCheck } from "lucide-react";
import PinSwitchModal from "./components/PinSwitchModal";
import { SOCKET_URL } from "./config";

// Route guard for authenticated staff
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.accessToken);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export function getDefaultRouteForRole(role?: string): string {
  switch (role) {
    case "chef":
      return "/kds";
    case "waiter":
      return "/tables";
    case "owner":
    case "manager":
    default:
      return "/dashboard";
  }
}

// Role-based route guard
function RoleRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: ("owner" | "manager" | "waiter" | "chef")[];
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }
  return <>{children}</>;
}

// Sidebar layout wrapper
function Layout() {
  const { user, clearAuth } = useAuthStore();
  const [pinSwitchOpen, setPinSwitchOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.restaurantId) return;
    const socket = io(SOCKET_URL);
    socket.emit("join-restaurant", user.restaurantId);

    socket.on("rating:lowRatingAlert", (data: any) => {
      // Only notify owners and managers of low ratings
      if (!["owner", "manager"].includes(user?.role || "")) return;
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav");
        audio.play();
      } catch (e) {}
      alert(`⚠️ LOW RATING ALERT: ${data.tableLabel} submitted a rating of ${data.overallRating} stars!\nComment: "${data.comment || 'No comment'}"`);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.restaurantId, user?.role]);

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const userRole = user?.role || "waiter";

  const allNavLinks = [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, roles: ["owner", "manager"] },
    { to: "/tables", label: "Tables", icon: <TableProperties className="w-4 h-4" />, roles: ["owner", "manager", "waiter"] },
    { to: "/menu-management", label: "Menu & Stock", icon: <BookOpen className="w-4 h-4" />, roles: ["owner", "manager", "waiter", "chef"] },
    { to: "/orders", label: "Orders & Bills", icon: <ClipboardList className="w-4 h-4" />, roles: ["owner", "manager", "waiter", "chef"] },
    { to: "/ratings", label: "Ratings & Reviews", icon: <Star className="w-4 h-4" />, roles: ["owner", "manager"] },
    { to: "/audit-logs", label: "Audit Logs", icon: <ShieldCheck className="w-4 h-4" />, roles: ["owner", "manager"] },
    { to: "/kds", label: "KDS Screen", icon: <ChefHat className="w-4 h-4" />, roles: ["owner", "manager", "waiter", "chef"] },
  ];

  const navLinks = allNavLinks.filter((link) => link.roles.includes(userRole));

  const consoleSubtitle =
    user?.role === "chef"
      ? "Kitchen Station"
      : user?.role === "waiter"
      ? "Service Terminal"
      : "Admin Console";

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100">
      {/* Sidebar - Hidden on print */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between p-6 no-print shrink-0">
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Gourmet POS</h2>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{consoleSubtitle}</span>
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

        {/* User profile & fast PIN switch footer */}
        <div className="pt-6 border-t border-zinc-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white truncate max-w-[120px]">{user?.name}</h4>
              <span className="text-[10px] text-zinc-500 capitalize">{user?.role}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPinSwitchOpen(true)}
                className="p-2 hover:bg-violet-950/60 rounded-xl text-zinc-400 hover:text-violet-400 border border-zinc-800 hover:border-violet-500/30 transition-all"
                title="Switch Active Staff via PIN"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-red-400 transition-colors"
                title="Log out device"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setPinSwitchOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[11px] font-bold border border-zinc-800 flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <KeyRound className="w-3.5 h-3.5 text-violet-400" />
            <span>Fast Staff Switch (PIN)</span>
          </button>
        </div>
      </aside>

      <PinSwitchModal isOpen={pinSwitchOpen} onClose={() => setPinSwitchOpen(false)} />

      {/* Main viewport */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        <Routes>
          <Route
            path="/dashboard"
            element={
              <RoleRoute allowedRoles={["owner", "manager"]}>
                <Dashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/tables"
            element={
              <RoleRoute allowedRoles={["owner", "manager", "waiter"]}>
                <Tables />
              </RoleRoute>
            }
          />
          <Route
            path="/menu-management"
            element={
              <RoleRoute allowedRoles={["owner", "manager", "waiter", "chef"]}>
                <MenuManagement />
              </RoleRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <RoleRoute allowedRoles={["owner", "manager", "waiter", "chef"]}>
                <Orders />
              </RoleRoute>
            }
          />
          <Route
            path="/ratings"
            element={
              <RoleRoute allowedRoles={["owner", "manager"]}>
                <Ratings />
              </RoleRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <RoleRoute allowedRoles={["owner", "manager"]}>
                <AuditLogs />
              </RoleRoute>
            }
          />
          <Route
            path="/kds"
            element={
              <RoleRoute allowedRoles={["owner", "manager", "waiter", "chef"]}>
                <KDS />
              </RoleRoute>
            }
          />
          <Route path="*" element={<Navigate to={getDefaultRouteForRole(user?.role)} replace />} />
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
