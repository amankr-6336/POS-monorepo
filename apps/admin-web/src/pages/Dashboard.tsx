import { useEffect, useState } from "react";
import io from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore";
import { Card, Button, Badge } from "@pos/ui";
import { formatCurrency, formatDate } from "@pos/utils";
import { Bell, ShieldAlert, DollarSign, LayoutList, MessageSquare } from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api/v1";

export default function Dashboard() {
  const { user, accessToken } = useAuthStore();
  const [queries, setQueries] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      
      const [qRes, oRes, tRes, iRes] = await Promise.all([
        fetch(`${API_BASE_URL}/table-queries`, { headers }),
        fetch(`${API_BASE_URL}/restaurants/${user?.restaurantId}/orders`, { headers }),
        fetch(`${API_BASE_URL}/restaurants/${user?.restaurantId}/tables`, { headers }),
        fetch(`${API_BASE_URL}/restaurants/${user?.restaurantId}/ingredients`, { headers }),
      ]);

      if (qRes.ok) setQueries(await qRes.json());
      if (oRes.ok) setOrders(await oRes.json());
      if (tRes.ok) setTables(await tRes.json());
      if (iRes.ok) setIngredients(await iRes.json());
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    }
  };

  useEffect(() => {
    if (!user?.restaurantId || !accessToken) return;
    
    fetchMetrics();

    // Sockets listener for table queries and order updates
    const socket = io("http://localhost:5000");
    socket.emit("join-restaurant", user.restaurantId);

    socket.on("tableQuery:new", (newQuery: any) => {
      setQueries((prev) => {
        if (prev.some((q) => q._id === newQuery.queryId)) return prev;
        // Play notification sound
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav");
          audio.play();
        } catch (e) {
          // audio play blocked by browser
        }
        return [...prev, {
          _id: newQuery.queryId,
          tableLabel: newQuery.tableLabel,
          location: newQuery.location,
          raisedAt: newQuery.raisedAt,
          status: "open",
        }];
      });
    });

    socket.on("tableQuery:resolved", (data: any) => {
      setQueries((prev) => prev.filter((q) => q._id !== data.queryId));
    });

    socket.on("order:new", () => {
      fetchMetrics();
    });

    socket.on("order:statusChanged", () => {
      fetchMetrics();
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.restaurantId, accessToken]);

  const handleResolveQuery = async (queryId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/table-queries/${queryId}/resolve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setQueries((prev) => prev.filter((q) => q._id !== queryId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Math metrics
  const activeTablesCount = tables.filter((t) => t.status !== "available").length;
  const pendingOrdersCount = orders.filter((o) => ["placed", "confirmed", "preparing", "ready"].includes(o.status)).length;
  
  const todayRevenue = orders
    .filter((o) => ["served", "billed"].includes(o.status))
    .reduce((acc, o) => acc + o.total, 0);

  const lowStockIngredients = ingredients.filter((i) => i.currentStock <= i.lowStockThreshold);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Dashboard Overview</h1>
        <p className="text-zinc-400 text-sm mt-1">Live metrics and counter assistance alerts</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/40 border-zinc-900 flex items-center gap-4">
          <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-2xl text-violet-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Today's Revenue</span>
            <h2 className="text-2xl font-black text-white mt-0.5">{formatCurrency(todayRevenue)}</h2>
          </div>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-900 flex items-center gap-4">
          <div className="p-4 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
            <LayoutList className="w-6 h-6" />
          </div>
          <div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Active Tables</span>
            <h2 className="text-2xl font-black text-white mt-0.5">
              {activeTablesCount} / {tables.length}
            </h2>
          </div>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-900 flex items-center gap-4">
          <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-blue-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Active Orders</span>
            <h2 className="text-2xl font-black text-white mt-0.5">{pendingOrdersCount}</h2>
          </div>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-900 flex items-center gap-4">
          <div className="p-4 bg-amber-600/10 border border-amber-500/20 rounded-2xl text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Low Stock Ingredients</span>
            <h2 className="text-2xl font-black text-white mt-0.5">{lowStockIngredients.length}</h2>
          </div>
        </Card>
      </div>

      {/* Main grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Queries Assistance Feed */}
        <Card className="lg:col-span-2 bg-zinc-900/40 border-zinc-900 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-400" />
              Counter Assistance Feed
            </h3>
            <Badge variant={queries.length > 0 ? "error" : "neutral"}>
              {queries.length} Open Requests
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[350px] flex flex-col gap-3 pr-1">
            {queries.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 font-light text-sm">
                No active waiter calls. All tables are comfortable!
              </div>
            ) : (
              queries.map((q) => (
                <div
                  key={q._id}
                  className="flex items-center justify-between p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-2xl transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-ping mt-1"></div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{q.tableLabel || "Table"}</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Location: {q.location || "Indoor"}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">Raised: {formatDate(q.raisedAt)}</p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleResolveQuery(q._id)}
                    className="text-xs px-3.5 py-1.5 font-semibold rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/10"
                  >
                    Resolve Alert
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Low Stock Alerts Card */}
        <Card className="bg-zinc-900/40 border-zinc-900 p-6 flex flex-col gap-4">
          <div className="pb-3 border-b border-zinc-800">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Low Stock Warnings
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[350px] flex flex-col gap-3 pr-1">
            {lowStockIngredients.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 font-light text-sm">
                All ingredients are fully stocked!
              </div>
            ) : (
              lowStockIngredients.map((i) => (
                <div
                  key={i._id}
                  className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-900 rounded-xl"
                >
                  <div>
                    <h4 className="font-bold text-white text-xs leading-none">{i.name}</h4>
                    <span className="text-[10px] text-zinc-500 mt-1.5 block">Threshold: {i.lowStockThreshold} {i.unit}</span>
                  </div>
                  <Badge variant="error" className="py-0.5 px-2">
                    {i.currentStock} {i.unit}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
