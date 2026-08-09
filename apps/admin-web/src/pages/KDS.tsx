import { useEffect, useState } from "react";
import io from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore";
import { Card, Button, Badge } from "@pos/ui";
import { Play, Check, Flame, Clock } from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api/v1";

// Simple relative timer hook
function TicketTimer({ startTime }: { startTime: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const updateTimer = () => {
      const now = Date.now();
      setSeconds(Math.floor((now - start) / 1000));
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  // Visual warning states
  let textColor = "text-zinc-400";
  if (minutes >= 10 && minutes < 20) {
    textColor = "text-amber-400 font-bold";
  } else if (minutes >= 20) {
    textColor = "text-red-400 font-bold";
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs ${textColor}`}>
      <Clock className="w-3.5 h-3.5" />
      <span>{minutes}:{remainingSeconds.toString().padStart(2, "0")} elapsed</span>
    </div>
  );
}

export default function KDS() {
  const { user, accessToken } = useAuthStore();
  const [selectedStation, setSelectedStation] = useState<string>(user?.assignedStation || "main-kitchen");
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/kots?station=${selectedStation}&restaurantId=${user?.restaurantId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        // filter out already ready/completed tickets
        const allKots = await res.json();
        const active = allKots.filter((t: any) => t.status === "new" || t.status === "in_progress");
        setTickets(active);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.restaurantId) {
      fetchTickets();
    }
  }, [selectedStation, user?.restaurantId]);

  // Connect socket and listen to station rooms
  useEffect(() => {
    if (!user?.restaurantId || !selectedStation) return;

    const socket = io("http://localhost:5000");
    
    // Join tenant + join specific kitchen station room
    socket.emit("join-station", { restaurantId: user.restaurantId, station: selectedStation });

    socket.on("kot:new", (newKot: any) => {
      // Play ticket audio chime
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav");
        audio.play();
      } catch (e) {
        // audio block
      }
      setTickets((prev) => {
        if (prev.some((t) => t._id === newKot._id)) return prev;
        return [...prev, newKot];
      });
    });

    socket.on("kot:statusChanged", (updatedKot: any) => {
      if (updatedKot.station === selectedStation) {
        if (updatedKot.status === "ready" || updatedKot.status === "acknowledged") {
          // Remove if marked ready
          setTickets((prev) => prev.filter((t) => t._id !== updatedKot._id));
        } else {
          // Update status in list
          setTickets((prev) =>
            prev.map((t) => (t._id === updatedKot._id ? updatedKot : t))
          );
        }
      }
    });

    return () => {
      socket.emit("leave-station", { restaurantId: user.restaurantId, station: selectedStation });
      socket.disconnect();
    };
  }, [selectedStation, user?.restaurantId]);

  const handleUpdateStatus = async (kotId: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/kots/${kotId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        // Optimistic / Local fetch updates
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-h-screen bg-zinc-950 text-zinc-100 p-4">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Flame className="w-8 h-8 text-violet-500 fill-violet-500/20" />
            Kitchen Display System
          </h1>
          <p className="text-zinc-500 text-xs mt-1">Live order routing tickets for kitchen stations</p>
        </div>

        {/* Station Select */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Cooking Station:</label>
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 font-bold focus:outline-none focus:border-violet-500 text-xs"
          >
            <option value="main-kitchen">Main Kitchen</option>
            <option value="grill">Grill Station</option>
            <option value="tandoor">Tandoor Station</option>
            <option value="bar">Bar Counter</option>
            <option value="dessert">Dessert Station</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-zinc-500 font-light text-sm bg-zinc-900/10 border border-zinc-900/50 rounded-3xl">
          🍳 All clear! No tickets currently in preparation.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tickets.map((t) => {
            const isPreparing = t.status === "in_progress";
            const start = new Date(t.createdAt).getTime();
            const elapsedMins = Math.floor((Date.now() - start) / 60000);
            
            let colorBorder = "border-zinc-900";
            if (elapsedMins >= 10 && elapsedMins < 20) colorBorder = "border-amber-500/20";
            if (elapsedMins >= 20) colorBorder = "border-red-500/40 shadow-lg shadow-red-500/5";

            return (
              <Card
                key={t._id}
                className={`p-5 flex flex-col justify-between bg-zinc-900/60 border ${colorBorder} min-h-[260px] rounded-2xl`}
              >
                <div>
                  <div className="flex justify-between items-start border-b border-zinc-800/80 pb-2.5">
                    <div>
                      <h3 className="font-extrabold text-white text-base leading-none">{t.tableLabel}</h3>
                      <span className="text-[9px] text-zinc-500 font-mono block mt-1">#KOT-{t._id.slice(-4).toUpperCase()}</span>
                    </div>
                    <Badge variant={isPreparing ? "preparing" : "neutral"} className="text-[9px] py-0.5 px-2">
                      {isPreparing ? "Preparing" : "New Ticket"}
                    </Badge>
                  </div>

                  {/* Items List */}
                  <div className="mt-3 flex flex-col gap-2">
                    {t.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex flex-col gap-0.5 border-b border-zinc-900 pb-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-zinc-200">{item.menuItemName}</span>
                          <span className="text-white bg-zinc-950 font-bold px-2 py-0.5 rounded-lg border border-zinc-800">x{item.quantity}</span>
                        </div>
                        {item.specialInstructions && (
                          <span className="text-[10px] text-amber-400 font-medium leading-normal">
                            📝 {item.specialInstructions}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-zinc-800 flex items-center justify-between">
                  <TicketTimer startTime={t.createdAt} />
                  
                  {isPreparing ? (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(t._id, "ready")}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-md shadow-emerald-600/10 active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" /> Serve Ready
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(t._id, "in_progress")}
                      className="text-xs bg-violet-600 hover:bg-violet-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-md shadow-violet-600/10 active:scale-95"
                    >
                      <Play className="w-3 h-3 fill-white" /> Start Cooking
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
