import { useEffect, useState } from "react";
import io from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore";
import { Card, Button, Badge } from "@pos/ui";
import { formatCurrency, formatDate } from "@pos/utils";
import { 
  Bell, 
  ShieldAlert, 
  DollarSign, 
  LayoutList, 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  Utensils, 
  PieChart, 
  Activity 
} from "lucide-react";

import { API_BASE_URL, SOCKET_URL } from "../config";

export default function Dashboard() {
  const { user, accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"analytics" | "live">("analytics");
  
  // Live operations state
  const [queries, setQueries] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);

  // Business Analytics state
  const [summary, setSummary] = useState<any>(null);
  const [popularItems, setPopularItems] = useState<any[]>([]);
  const [orderStatus, setOrderStatus] = useState<any[]>([]);
  const [busyHours, setBusyHours] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  
  const [chartPeriod, setChartPeriod] = useState<"7days" | "30days" | "12months">("7days");
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Fetch live operational metrics
  const fetchLiveMetrics = async () => {
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
      console.error("Failed to load dashboard live metrics:", err);
    }
  };

  // Fetch analytical summaries and trends
  const fetchAnalytics = async () => {
    if (!user?.restaurantId || !accessToken) return;
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [sRes, pRes, oRes, bRes] = await Promise.all([
        fetch(`${API_BASE_URL}/restaurants/${user.restaurantId}/analytics/summary`, { headers }),
        fetch(`${API_BASE_URL}/restaurants/${user.restaurantId}/analytics/popular-items`, { headers }),
        fetch(`${API_BASE_URL}/restaurants/${user.restaurantId}/analytics/order-status`, { headers }),
        fetch(`${API_BASE_URL}/restaurants/${user.restaurantId}/analytics/busy-hours`, { headers }),
      ]);

      if (sRes.ok) setSummary(await sRes.json());
      if (pRes.ok) setPopularItems(await pRes.json());
      if (oRes.ok) setOrderStatus(await oRes.json());
      if (bRes.ok) setBusyHours(await bRes.json());
    } catch (err) {
      console.error("Failed to load business analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Fetch revenue trends based on period selection
  const fetchRevenueChart = async (period: string) => {
    if (!user?.restaurantId || !accessToken) return;
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const rRes = await fetch(`${API_BASE_URL}/restaurants/${user.restaurantId}/analytics/revenue-chart?period=${period}`, { headers });
      if (rRes.ok) setRevenueData(await rRes.json());
    } catch (err) {
      console.error("Failed to load revenue chart:", err);
    }
  };

  useEffect(() => {
    if (!user?.restaurantId || !accessToken) return;
    
    fetchLiveMetrics();
    fetchAnalytics();
    fetchRevenueChart(chartPeriod);

    // Socket.IO listeners
    const socket = io(SOCKET_URL);
    socket.emit("join-restaurant", user.restaurantId);

    socket.on("tableQuery:new", (newQuery: any) => {
      setQueries((prev) => {
        if (prev.some((q) => q._id === newQuery.queryId)) return prev;
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
      fetchLiveMetrics();
      fetchAnalytics();
      fetchRevenueChart(chartPeriod);
    });

    socket.on("order:statusChanged", () => {
      fetchLiveMetrics();
      fetchAnalytics();
      fetchRevenueChart(chartPeriod);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.restaurantId, accessToken]);

  // Refetch revenue data when period changes
  useEffect(() => {
    if (!user?.restaurantId || !accessToken) return;
    fetchRevenueChart(chartPeriod);
  }, [chartPeriod]);

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

  // Live Counter Metrics
  const activeTablesCount = tables.filter((t) => t.status !== "available").length;
  const pendingOrdersCount = orders.filter((o) => ["placed", "confirmed", "preparing", "ready"].includes(o.status)).length;
  
  const todayRevenue = orders
    .filter((o) => ["served", "billed"].includes(o.status))
    .reduce((acc, o) => acc + o.total, 0);

  const lowStockIngredients = ingredients.filter((i) => i.currentStock <= i.lowStockThreshold);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-zinc-400 text-sm mt-1">Live metrics and analytical intelligence suite</p>
        </div>

        {/* Tab Selector */}
        <div className="flex p-1 bg-zinc-950/80 border border-zinc-800 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "analytics"
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/10"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Business Analytics
          </button>
          <button
            onClick={() => setActiveTab("live")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "live"
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/10"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
            }`}
          >
            <Activity className="w-4 h-4" />
            Live Ops Feed
            {queries.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Operations Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/40 border-zinc-900 flex items-center gap-4 hover:border-violet-500/30 transition-all duration-300">
          <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-2xl text-violet-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Today's Revenue</span>
            <h2 className="text-2xl font-black text-white mt-0.5">{formatCurrency(todayRevenue)}</h2>
          </div>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-900 flex items-center gap-4 hover:border-emerald-500/30 transition-all duration-300">
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

        <Card className="bg-zinc-900/40 border-zinc-900 flex items-center gap-4 hover:border-blue-500/30 transition-all duration-300">
          <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-blue-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Active Orders</span>
            <h2 className="text-2xl font-black text-white mt-0.5">{pendingOrdersCount}</h2>
          </div>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-900 flex items-center gap-4 hover:border-amber-500/30 transition-all duration-300">
          <div className="p-4 bg-amber-600/10 border border-amber-500/20 rounded-2xl text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Low Stock Warnings</span>
            <h2 className="text-2xl font-black text-white mt-0.5">{lowStockIngredients.length}</h2>
          </div>
        </Card>
      </div>

      {/* Tab Contents */}
      {activeTab === "analytics" ? (
        <div className="flex flex-col gap-6">
          {/* Analytics Summary Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-950/40 border border-zinc-900/80 rounded-2xl p-5">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Historical Revenue</span>
              <p className="text-xl font-black text-white mt-1">{summary ? formatCurrency(summary.totalRevenue) : "$0.00"}</p>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-900/80 rounded-2xl p-5">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Total Sales Count</span>
              <p className="text-xl font-black text-white mt-1">{summary ? `${summary.totalOrders} orders` : "0 orders"}</p>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-900/80 rounded-2xl p-5">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Average Order Value</span>
              <p className="text-xl font-black text-white mt-1">{summary ? formatCurrency(summary.averageOrderValue) : "$0.00"}</p>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-900/80 rounded-2xl p-5">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Table Occupancy</span>
              <p className="text-xl font-black text-white mt-1">{summary ? `${summary.occupancyRate}%` : "0%"}</p>
            </div>
          </div>

          {/* Interactive Revenue Chart */}
          <Card className="bg-zinc-900/40 border-zinc-900 p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-violet-400" />
                  Sales Performance & Volume
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Track revenue and completed ticket volume trends</p>
              </div>

              {/* Chart Period Selector */}
              <div className="flex p-1 bg-zinc-950 border border-zinc-900 rounded-xl w-fit self-end sm:self-auto">
                {(["7days", "30days", "12months"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setChartPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                      chartPeriod === p
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    {p === "7days" ? "7 Days" : p === "30days" ? "30 Days" : "12 Months"}
                  </button>
                ))}
              </div>
            </div>

            {loadingAnalytics ? (
              <div className="h-[240px] flex items-center justify-center text-zinc-500 text-sm">
                Fetching analytics data...
              </div>
            ) : revenueData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-zinc-500 text-sm font-light">
                No revenue recorded in this period yet.
              </div>
            ) : (
              <div className="relative w-full h-[240px] mt-2">
                <RevenueChart data={revenueData} />
              </div>
            )}
          </Card>

          {/* Double Column Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling Items */}
            <Card className="bg-zinc-900/40 border-zinc-900 p-6 flex flex-col gap-4">
              <div className="pb-3 border-b border-zinc-800">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-indigo-400" />
                  Popular Dishes
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Menu items generating the highest customer demand</p>
              </div>

              <div className="flex-1 flex flex-col gap-4 py-2">
                {popularItems.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 font-light text-sm">
                    No order items details recorded yet.
                  </div>
                ) : (
                  popularItems.map((item, index) => {
                    const maxQty = Math.max(...popularItems.map(i => i.quantitySold), 1);
                    const pct = (item.quantitySold / maxQty) * 100;
                    return (
                      <div key={item.menuItemId} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 flex items-center justify-center bg-zinc-950 border border-zinc-800 text-[10px] font-black text-indigo-400 rounded-lg">
                              #{index + 1}
                            </span>
                            <span className="text-white font-bold">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-zinc-400">
                            <span>{item.quantitySold} sold</span>
                            <span className="font-black text-white">{formatCurrency(item.revenue)}</span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Order Status Breakdown */}
            <Card className="bg-zinc-900/40 border-zinc-900 p-6 flex flex-col gap-4">
              <div className="pb-3 border-b border-zinc-800">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-emerald-400" />
                  Order Status Breakdown
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Distribution of all customer tickets placed</p>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <OrderStatusChart data={orderStatus} />
              </div>
            </Card>
          </div>

          {/* Peak Business Hours */}
          <Card className="bg-zinc-900/40 border-zinc-900 p-6 flex flex-col gap-4">
            <div className="pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Peak Business Hours
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Determine the busiest times of day for staff scheduling</p>
            </div>

            {busyHours.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 font-light text-sm">
                No hourly statistics recorded yet.
              </div>
            ) : (
              <div className="w-full mt-2">
                <BusyHoursChart data={busyHours} />
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Counter Assistance Feed (Left 2-cols) */}
          <Card className="lg:col-span-2 bg-zinc-900/40 border-zinc-900 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-violet-400" />
                  Counter Assistance Feed
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Waiter calling requests raised directly from table QR codes</p>
              </div>
              <Badge variant={queries.length > 0 ? "error" : "neutral"}>
                {queries.length} Open Requests
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px] flex flex-col gap-3 pr-1">
              {queries.length === 0 ? (
                <div className="text-center py-14 text-zinc-500 font-light text-sm">
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

          {/* Low Stock Warnings (Right 1-col) */}
          <Card className="bg-zinc-900/40 border-zinc-900 p-6 flex flex-col gap-4">
            <div className="pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                Low Stock Warnings
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Ingredients running below inventory safety thresholds</p>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px] flex flex-col gap-3 pr-1">
              {lowStockIngredients.length === 0 ? (
                <div className="text-center py-14 text-zinc-500 font-light text-sm">
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
      )}
    </div>
  );
}

// ==========================================
// 1. REVENUE AREA/LINE CHART COMPONENT
// ==========================================
function RevenueChart({ data }: { data: any[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 600;
  const height = 240;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map(d => d.revenue), 100);
  const chartMax = maxVal * 1.15; // 15% headroom

  // Construct SVG paths
  let linePath = "";
  let areaPath = "";

  if (data.length > 1) {
    data.forEach((d, i) => {
      const x = paddingLeft + (i / (data.length - 1)) * plotWidth;
      const y = paddingTop + plotHeight - (d.revenue / chartMax) * plotHeight;
      if (i === 0) {
        linePath = `M ${x} ${y}`;
        areaPath = `M ${x} ${paddingTop + plotHeight} L ${x} ${y}`;
      } else {
        linePath += ` L ${x} ${y}`;
        areaPath += ` L ${x} ${y}`;
      }
    });
    areaPath += ` L ${paddingLeft + plotWidth} ${paddingTop + plotHeight} Z`;
  }

  // Draw grid helper
  const ticks = [0, 0.33, 0.66, 1];

  return (
    <div className="relative w-full h-full">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Y Axis Gridlines & Text Labels */}
        {ticks.map((t) => {
          const yVal = chartMax * t;
          const yPos = paddingTop + plotHeight - t * plotHeight;
          return (
            <g key={t}>
              <line
                x1={paddingLeft}
                y1={yPos}
                x2={paddingLeft + plotWidth}
                y2={yPos}
                stroke="#27272a"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={paddingLeft - 10}
                y={yPos + 4}
                textAnchor="end"
                className="fill-zinc-600 text-[10px] font-semibold"
              >
                {formatCurrency(yVal).replace(".00", "")}
              </text>
            </g>
          );
        })}

        {/* Area Fill */}
        {areaPath && (
          <path d={areaPath} fill="url(#chartGrad)" />
        )}

        {/* Main Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Interactive Hover Indicators */}
        {hoveredIndex !== null && data[hoveredIndex] && (() => {
          const x = paddingLeft + (hoveredIndex / (data.length - 1)) * plotWidth;
          const y = paddingTop + plotHeight - (data[hoveredIndex].revenue / chartMax) * plotHeight;
          return (
            <g>
              <line
                x1={x}
                y1={paddingTop}
                x2={x}
                y2={paddingTop + plotHeight}
                stroke="#8b5cf6"
                strokeWidth="1.5"
                strokeOpacity="0.4"
                strokeDasharray="4 4"
              />
              <circle
                cx={x}
                cy={y}
                r="6.5"
                fill="#8b5cf6"
                stroke="#ffffff"
                strokeWidth="2.5"
                className="shadow-lg"
              />
            </g>
          );
        })()}

        {/* X Axis Labels */}
        {data.map((d, i) => {
          // Display labels conditionally depending on data count to avoid crowding
          const step = data.length > 15 ? 5 : data.length > 7 ? 2 : 1;
          if (i % step !== 0 && i !== data.length - 1) return null;

          const x = paddingLeft + (i / (data.length - 1)) * plotWidth;
          return (
            <text
              key={d.date}
              x={x}
              y={paddingTop + plotHeight + 20}
              textAnchor="middle"
              className="fill-zinc-500 text-[9px] font-semibold uppercase tracking-wider"
            >
              {d.label}
            </text>
          );
        })}

        {/* Transparent Interactive Columns */}
        {data.map((d, i) => {
          const stepWidth = plotWidth / (data.length - 1 || 1);
          const x = paddingLeft + i * stepWidth - stepWidth / 2;
          return (
            <rect
              key={d.date}
              x={x}
              y={paddingTop}
              width={stepWidth}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            />
          );
        })}
      </svg>

      {/* Tooltip Card */}
      {hoveredIndex !== null && data[hoveredIndex] && (() => {
        const x = paddingLeft + (hoveredIndex / (data.length - 1)) * plotWidth;
        // Float tooltip: position on left if index is in right half
        const alignLeft = hoveredIndex > data.length / 2;
        return (
          <div
            className="absolute bg-zinc-950/95 border border-zinc-800/80 p-3 rounded-2xl shadow-2xl backdrop-blur-md text-xs pointer-events-none transition-all duration-100 ease-out z-10"
            style={{
              left: `${alignLeft ? x - 130 : x + 15}px`,
              top: `${paddingTop}px`
            }}
          >
            <p className="font-bold text-zinc-500 text-[10px] uppercase tracking-wider">{data[hoveredIndex].date}</p>
            <p className="font-black text-white mt-1.5 text-base">
              {formatCurrency(data[hoveredIndex].revenue)}
            </p>
            <div className="flex items-center gap-1.5 text-zinc-400 mt-1 text-[10px]">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
              <span>{data[hoveredIndex].orders} Orders Completed</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ==========================================
// 2. ORDER STATUS DOUGHNUT CHART
// ==========================================
function OrderStatusChart({ data }: { data: any[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const r = 55;
  const cx = 75;
  const cy = 75;
  const strokeWidth = 14;
  const circ = 2 * Math.PI * r;

  const colors: Record<string, string> = {
    placed: "#3b82f6",      // Blue
    confirmed: "#6366f1",   // Indigo
    preparing: "#eab308",   // Yellow
    ready: "#ec4899",       // Pink
    served: "#10b981",      // Emerald
    billed: "#8b5cf6",      // Violet
    cancelled: "#ef4444",   // Red
  };

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 h-full w-full">
        <svg width="130" height="130" viewBox="0 0 130 130">
          <circle cx="65" cy="65" r="50" fill="none" stroke="#27272a" strokeWidth={12} />
          <text x="65" y="70" textAnchor="middle" className="fill-zinc-600 font-bold text-[10px] uppercase tracking-wider">No Orders</text>
        </svg>
      </div>
    );
  }

  let currentOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8 justify-around py-4 w-full">
      {/* Doughnut SVG */}
      <div className="relative w-[150px] h-[150px] flex-shrink-0">
        <svg width="150" height="150" viewBox="0 0 150 150" className="transform rotate-[-90deg]">
          {data.map((item) => {
            if (item.count === 0) return null;
            const pct = item.count / total;
            const strokeLength = pct * circ;
            const strokeOffset = circ - strokeLength + currentOffset;
            currentOffset -= strokeLength;
            
            return (
              <circle
                key={item.status}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={colors[item.status] || "#71717a"}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeLength} ${circ}`}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-300 hover:stroke-[16px] cursor-pointer"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Total</span>
          <span className="text-2xl font-black text-white mt-1 leading-none">{total}</span>
        </div>
      </div>

      {/* Legend list */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs w-full max-w-[260px] sm:max-w-none">
        {data.map((item) => {
          if (item.count === 0) return null;
          return (
            <div key={item.status} className="flex items-center justify-between gap-3 border-b border-zinc-950 pb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colors[item.status] }}
                />
                <span className="text-zinc-400 capitalize font-medium">{item.status}</span>
              </div>
              <span className="font-black text-white text-sm">{item.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 3. PEAK HOURS BAR CHART
// ==========================================
function BusyHoursChart({ data }: { data: any[] }) {
  // Operating hours filters (8 AM to 10 PM)
  const activeHours = data.filter(d => d.hour >= 8 && d.hour <= 22);
  const maxOrders = Math.max(...activeHours.map(d => d.orders), 1);

  const width = 600;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const barWidth = (plotWidth / activeHours.length) * 0.7;
  const barSpacing = (plotWidth / activeHours.length) * 0.3;

  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>

        {/* Y Gridlines */}
        {[0, 0.5, 1].map((tick) => {
          const y = paddingTop + plotHeight - tick * plotHeight;
          return (
            <g key={tick}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={paddingLeft + plotWidth}
                y2={y}
                stroke="#27272a"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={paddingLeft - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-zinc-600 text-[10px] font-semibold"
              >
                {Math.round(tick * maxOrders)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {activeHours.map((d, i) => {
          const x = paddingLeft + i * (barWidth + barSpacing) + barSpacing / 2;
          const barHeight = (d.orders / maxOrders) * plotHeight;
          const y = paddingTop + plotHeight - barHeight;

          return (
            <g key={d.hour}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)} // Minimum height 2px to show zero values nicely
                rx="4.5"
                fill={hoveredBar === i ? "url(#barGradHover)" : "url(#barGrad)"}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredBar(i)}
                onMouseLeave={() => setHoveredBar(null)}
              />
              {/* Labels displayed for every 2nd column to avoid overflow */}
              {i % 2 === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={paddingTop + plotHeight + 18}
                  textAnchor="middle"
                  className="fill-zinc-500 text-[9px] font-bold uppercase tracking-wider"
                >
                  {d.label.replace(" PM", "PM").replace(" AM", "AM")}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip Card */}
      {hoveredBar !== null && activeHours[hoveredBar] && (() => {
        const x = paddingLeft + hoveredBar * (barWidth + barSpacing) + barWidth / 2;
        const isRightSide = hoveredBar > activeHours.length / 2;
        return (
          <div
            className="absolute bg-zinc-950/95 border border-zinc-800 p-2.5 rounded-2xl shadow-xl backdrop-blur-md text-xs pointer-events-none transition-all duration-100 ease-out z-10"
            style={{
              left: `${isRightSide ? x - 120 : x + 15}px`,
              top: `${paddingTop}px`
            }}
          >
            <p className="font-bold text-white text-[10px] uppercase tracking-wider">{activeHours[hoveredBar].label}</p>
            <p className="text-violet-400 font-bold mt-1 text-sm">{activeHours[hoveredBar].orders} Orders</p>
            <p className="text-zinc-500 text-[10px] mt-0.5">Sales: {formatCurrency(activeHours[hoveredBar].revenue)}</p>
          </div>
        );
      })()}
    </div>
  );
}
