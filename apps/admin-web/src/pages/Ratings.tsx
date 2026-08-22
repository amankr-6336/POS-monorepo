import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Card, Button, Badge } from "@pos/ui";
import { formatDate } from "@pos/utils";
import { 
  Star, 
  Check, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Utensils,
  ChevronRight
} from "lucide-react";

import { API_BASE_URL } from "../config";

export default function Ratings() {
  const { user, accessToken } = useAuthStore();
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "queue" | "history">("overview");

  // Overview stats
  const [overview, setOverview] = useState<any>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Queue & History ratings
  const [ratings, setRatings] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingRatings, setLoadingRatings] = useState(true);

  // Per-dish detail modal state
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [selectedDishName, setSelectedDishName] = useState<string>("");
  const [dishRatingsDetails, setDishRatingsDetails] = useState<any>(null);
  const [loadingDishDetails, setLoadingDishDetails] = useState(false);

  const fetchOverview = async () => {
    if (!user?.restaurantId || !accessToken) return;
    setLoadingOverview(true);
    try {
      const res = await fetch(`${API_BASE_URL}/restaurants/${user.restaurantId}/ratings/overview`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setOverview(await res.json());
      }
    } catch (err) {
      console.error("Failed to load ratings overview:", err);
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchRatings = async (page = 1, flagged = false) => {
    if (!user?.restaurantId || !accessToken) return;
    setLoadingRatings(true);
    try {
      const url = `${API_BASE_URL}/restaurants/${user.restaurantId}/ratings?page=${page}&limit=10${
        flagged ? "&flaggedOnly=true" : ""
      }`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRatings(data.ratings);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
        setCurrentPage(data.currentPage);
      }
    } catch (err) {
      console.error("Failed to load ratings:", err);
    } finally {
      setLoadingRatings(false);
    }
  };

  const fetchDishDetails = async (menuItemId: string) => {
    if (!accessToken) return;
    setLoadingDishDetails(true);
    try {
      const res = await fetch(`${API_BASE_URL}/menu-items/${menuItemId}/ratings`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setDishRatingsDetails(await res.json());
      }
    } catch (err) {
      console.error("Failed to load dish rating details:", err);
    } finally {
      setLoadingDishDetails(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [user?.restaurantId, accessToken]);

  useEffect(() => {
    if (activeSubTab === "queue") {
      fetchRatings(1, true);
    } else if (activeSubTab === "history") {
      fetchRatings(1, false);
    }
  }, [activeSubTab, user?.restaurantId, accessToken]);

  const handleResolveFollowUp = async (ratingId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/ratings/${ratingId}/resolve-followup`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        // Refresh queue
        fetchRatings(currentPage, activeSubTab === "queue");
        fetchOverview(); // Refresh counts
        alert("Alert resolved successfully!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDishDetails = (dishId: string, dishName: string) => {
    setSelectedDishId(dishId);
    setSelectedDishName(dishName);
    fetchDishDetails(dishId);
  };

  const handleCloseDishDetails = () => {
    setSelectedDishId(null);
    setDishRatingsDetails(null);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const rounded = Math.round(rating);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${
            i <= rounded ? "fill-amber-400 stroke-amber-400" : "stroke-zinc-600 fill-transparent"
          }`}
        />
      );
    }
    return <div className="flex gap-0.5">{stars}</div>;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Customer Feedbacks & Ratings</h1>
          <p className="text-zinc-400 text-sm mt-1">Monitor operational feedback, resolve alerts, and track popular dish ratings</p>
        </div>

        {/* Toggles */}
        <div className="flex p-1 bg-zinc-950 border border-zinc-800 rounded-2xl w-fit">
          <button
            onClick={() => setActiveSubTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "overview"
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/10"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveSubTab("queue")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === "queue"
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
            }`}
          >
            Follow-Up Queue
            {overview?.flaggedCount > 0 && (
              <span className="px-1.5 py-0.5 bg-red-600 text-white font-mono text-[9px] rounded-full animate-pulse">
                {overview.flaggedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "history"
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
            }`}
          >
            Review History
          </button>
        </div>
      </div>

      {/* OVERVIEW SUBTAB */}
      {activeSubTab === "overview" && (
        <div className="flex flex-col gap-6">
          {/* Main Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-zinc-900/40 border-zinc-900 flex items-center gap-5 p-6 hover:border-violet-500/30 transition-all duration-300">
              <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-2xl text-violet-400">
                <Star className="w-8 h-8 fill-violet-400/20" />
              </div>
              <div>
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Overall Rating Average</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <h2 className="text-4xl font-black text-white">{overview?.overallAverage || "0.0"}</h2>
                  <span className="text-zinc-400 text-sm font-medium">/ 5.0</span>
                </div>
              </div>
            </Card>

            <Card className="bg-zinc-900/40 border-zinc-900 flex items-center gap-5 p-6 hover:border-indigo-500/30 transition-all duration-300">
              <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div>
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Total Feedbacks Received</span>
                <h2 className="text-4xl font-black text-white mt-1">{overview?.totalRatingsCount || 0}</h2>
              </div>
            </Card>

            <Card className="bg-zinc-900/40 border-zinc-900 flex items-center gap-5 p-6 hover:border-red-500/30 transition-all duration-300">
              <div className="p-4 bg-red-600/10 border border-red-500/20 rounded-2xl text-red-400">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Flagged Incidents (Queue)</span>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-4xl font-black text-white">{ratings.filter(r => r.flaggedForFollowUp).length || overview?.flaggedCount || 0}</h2>
                  {overview?.flaggedCount > 0 && (
                    <Badge variant="error" className="py-0.5 px-2 text-[10px] animate-pulse">Action Required</Badge>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Top & Bottom Dishes Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Dishes */}
            <Card className="bg-zinc-900/40 border-zinc-900 p-6">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-4 mb-4">
                <div className="w-8 h-8 bg-emerald-600/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Top Rated Dishes</h3>
                  <p className="text-xs text-zinc-400">Menu items ranked with weighted Bayesian scores</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {loadingOverview ? (
                  <div className="text-center py-6 text-zinc-500 font-light text-xs">Loading stats...</div>
                ) : !overview?.topDishes || overview.topDishes.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 font-light text-xs">No rated dishes recorded yet</div>
                ) : (
                  overview.topDishes.map((dish: any, index: number) => (
                    <div 
                      key={dish._id} 
                      onClick={() => handleOpenDishDetails(dish._id, dish.name)}
                      className="flex items-center justify-between p-3 bg-zinc-950/40 hover:bg-zinc-900/50 border border-zinc-900 hover:border-zinc-800 rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 flex items-center justify-center bg-zinc-900 text-[10px] font-black text-emerald-400 rounded-lg">
                          #{index + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-white text-xs group-hover:text-violet-400 transition-colors">{dish.name}</h4>
                          <span className="text-[10px] text-zinc-500 mt-0.5 block">{dish.ratingCount} reviews</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                          <span className="text-xs font-black text-white">{dish.avgRating.toFixed(1)}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Bottom 5 Dishes */}
            <Card className="bg-zinc-900/40 border-zinc-900 p-6">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-4 mb-4">
                <div className="w-8 h-8 bg-rose-600/10 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Bottom Rated Dishes</h3>
                  <p className="text-xs text-zinc-400">Needs attention or recipe updates</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {loadingOverview ? (
                  <div className="text-center py-6 text-zinc-500 font-light text-xs">Loading stats...</div>
                ) : !overview?.bottomDishes || overview.bottomDishes.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 font-light text-xs">No rated dishes recorded yet</div>
                ) : (
                  overview.bottomDishes.map((dish: any, index: number) => (
                    <div 
                      key={dish._id} 
                      onClick={() => handleOpenDishDetails(dish._id, dish.name)}
                      className="flex items-center justify-between p-3 bg-zinc-950/40 hover:bg-zinc-900/50 border border-zinc-900 hover:border-zinc-800 rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 flex items-center justify-center bg-zinc-900 text-[10px] font-black text-rose-400 rounded-lg">
                          #{index + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-white text-xs group-hover:text-violet-400 transition-colors">{dish.name}</h4>
                          <span className="text-[10px] text-zinc-500 mt-0.5 block">{dish.ratingCount} reviews</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 fill-rose-500 stroke-rose-500" />
                          <span className="text-xs font-black text-white">{dish.avgRating.toFixed(1)}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* FOLLOW UP QUEUE */}
      {activeSubTab === "queue" && (
        <Card className="bg-zinc-900/40 border-zinc-900 p-6 flex flex-col gap-4">
          <div className="border-b border-zinc-800 pb-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                Follow-Up Resolution Queue
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Critical low ratings (1-2 stars) awaiting managerial intervention</p>
            </div>
            <Badge variant="error" className="py-1 px-3">
              {ratings.length} Open Incidents
            </Badge>
          </div>

          <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
            {loadingRatings ? (
              <div className="text-center py-10 text-zinc-500">Loading open incidents...</div>
            ) : ratings.length === 0 ? (
              <div className="text-center py-14 text-zinc-500 font-light text-sm">
                No open low ratings alerts! The restaurant is running perfectly.
              </div>
            ) : (
              ratings.map((rating) => (
                <div 
                  key={rating._id}
                  className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-2xl transition-all gap-4"
                >
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="error" className="text-[9px] py-0.5 px-2">Low Rating</Badge>
                      <span className="text-xs text-white font-bold">{rating.tableId?.label || "Table"}</span>
                      <span className="text-zinc-500 text-[10px] font-mono">Order: #{rating.orderId?._id?.slice(-6).toUpperCase() || "N/A"}</span>
                      <span className="text-zinc-500 text-[10px]">{formatDate(rating.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(rating.overallRating)}
                      <span className="text-zinc-400 text-xs font-bold">{rating.customerId?.name || "Anonymous Customer"}</span>
                    </div>

                    {rating.overallComment ? (
                      <p className="text-xs text-zinc-300 italic bg-zinc-950/40 p-3 border border-zinc-900 rounded-xl mt-1">
                        "{rating.overallComment}"
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500 italic mt-1 pl-1">No overall comment provided</p>
                    )}

                    {/* Dish ratings details summary */}
                    {rating.dishRatings?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rating.dishRatings.map((dr: any) => (
                          <div key={dr.menuItemId} className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-[10px] rounded-lg text-zinc-400 flex items-center gap-1.5">
                            <span>{dr.menuItemId?.name || "Dish"}</span>
                            <div className="flex items-center text-amber-500">
                              <Star className="w-2.5 h-2.5 fill-amber-500" />
                              <span className="font-bold ml-0.5">{dr.rating}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleResolveFollowUp(rating._id)}
                    className="w-full md:w-auto text-xs px-4 py-2 font-bold rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/10 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Resolve Alert
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* ALL REVIEW HISTORY */}
      {activeSubTab === "history" && (
        <Card className="bg-zinc-900/40 border-zinc-900 p-6 flex flex-col gap-4">
          <div className="border-b border-zinc-800 pb-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                Customer Feedbacks Registry
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Chronological record of overall and dish-level ratings submissions</p>
            </div>
            <Badge variant="neutral" className="py-1 px-3">
              {totalCount} Total Entries
            </Badge>
          </div>

          <div className="flex flex-col gap-4">
            {loadingRatings ? (
              <div className="text-center py-10 text-zinc-500">Loading history...</div>
            ) : ratings.length === 0 ? (
              <div className="text-center py-14 text-zinc-500 font-light text-sm">
                No ratings submitted yet.
              </div>
            ) : (
              ratings.map((rating) => (
                <div 
                  key={rating._id}
                  className="p-5 bg-zinc-950/30 border border-zinc-900 rounded-2xl flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2.5">
                        {renderStars(rating.overallRating)}
                        <span className="text-xs font-bold text-white">{rating.customerId?.name || "Customer"}</span>
                        <span className="text-zinc-500 text-[10px]">{formatDate(rating.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                        <span>{rating.tableId?.label || "Table"}</span>
                        <span>•</span>
                        <span>Order #{rating.orderId?._id?.slice(-6).toUpperCase() || "N/A"}</span>
                        {rating.flaggedForFollowUp && (
                          <span className="ml-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                        )}
                        {!rating.flaggedForFollowUp && rating.resolvedAt && (
                          <span className="ml-2 text-emerald-400 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Resolved by {rating.resolvedByStaffId?.name || "Staff"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {rating.overallComment && (
                    <p className="text-xs text-zinc-300 italic bg-zinc-950/60 p-3 rounded-xl border border-zinc-900 max-w-2xl">
                      "{rating.overallComment}"
                    </p>
                  )}

                  {/* Dish Ratings */}
                  {rating.dishRatings?.length > 0 && (
                    <div className="mt-1 flex flex-col gap-2">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500">Dish Reviews</span>
                      <div className="flex flex-wrap gap-3">
                        {rating.dishRatings.map((dr: any) => (
                          <div key={dr.menuItemId} className="flex flex-col bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5 text-xs gap-1 max-w-xs">
                            <div className="flex justify-between gap-6 items-center">
                              <span className="font-bold text-zinc-300">{dr.menuItemId?.name || "Dish"}</span>
                              <div className="flex items-center text-amber-500 flex-shrink-0">
                                <Star className="w-3 h-3 fill-amber-500" />
                                <span className="font-black text-[10px] ml-0.5">{dr.rating}</span>
                              </div>
                            </div>
                            {dr.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {dr.tags.map((t: string) => (
                                  <span key={t} className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 text-[8px] font-bold text-zinc-400 rounded-full">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                            {dr.comment && (
                              <span className="text-[10px] text-zinc-400 italic block mt-0.5 font-light">"{dr.comment}"</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-900 no-print">
                <Button
                  variant="secondary"
                  disabled={currentPage === 1 || loadingRatings}
                  onClick={() => fetchRatings(currentPage - 1, false)}
                  className="text-xs px-4 py-2 font-bold bg-zinc-900 border border-zinc-800 hover:bg-zinc-800"
                >
                  Previous
                </Button>
                <span className="text-xs text-zinc-500">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={currentPage === totalPages || loadingRatings}
                  onClick={() => fetchRatings(currentPage + 1, false)}
                  className="text-xs px-4 py-2 font-bold bg-zinc-900 border border-zinc-800 hover:bg-zinc-800"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* DETAILED PER-DISH RATING MODAL */}
      {selectedDishId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseDishDetails}></div>
          <Card className="relative w-full max-w-md bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-bold text-white truncate max-w-[280px]">{selectedDishName}</h3>
              </div>
              <button
                onClick={handleCloseDishDetails}
                className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 pr-1 flex flex-col gap-5">
              {loadingDishDetails ? (
                <div className="text-center py-10 text-zinc-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-violet-400" /> Load details...
                </div>
              ) : !dishRatingsDetails ? (
                <div className="text-center py-10 text-zinc-500">Failed to load statistics</div>
              ) : (
                <>
                  {/* Rating overview inside modal */}
                  <div className="flex items-center gap-4 p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl">
                    <div className="text-center border-r border-zinc-900 pr-6">
                      <h4 className="text-3xl font-black text-white">{dishRatingsDetails.avgRating.toFixed(1)}</h4>
                      <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Score</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">{renderStars(dishRatingsDetails.avgRating)}</div>
                      <span className="text-xs text-zinc-400 mt-1 block">{dishRatingsDetails.ratingCount} Customer Reviews</span>
                    </div>
                  </div>

                  {/* Rating distribution chart */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-500">Star Distribution</h4>
                    <div className="flex flex-col gap-2 mt-1">
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const count = dishRatingsDetails.distribution[stars] || 0;
                        const total = dishRatingsDetails.ratingCount || 1;
                        const pct = (count / total) * 100;
                        return (
                          <div key={stars} className="flex items-center gap-3 text-xs">
                            <span className="w-3 text-zinc-500 font-mono text-right">{stars}</span>
                            <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400 flex-shrink-0" />
                            <div className="flex-1 h-2 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-6 text-zinc-400 font-mono text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Comments & tags */}
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-500">Dish Reviews Registry</h4>
                    <div className="flex flex-col gap-3">
                      {dishRatingsDetails.comments.length === 0 ? (
                        <p className="text-center py-6 text-xs text-zinc-600 font-light">No comments or tags submitted for this dish</p>
                      ) : (
                        dishRatingsDetails.comments.map((c: any, idx: number) => (
                          <div key={idx} className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-xs">{c.customerName}</span>
                                <span className="text-zinc-600 text-[10px]">{formatDate(c.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-0.5 text-amber-500">
                                <Star className="w-3 h-3 fill-amber-500" />
                                <span className="text-xs font-black">{c.rating}</span>
                              </div>
                            </div>

                            {c.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {c.tags.map((t: string) => (
                                  <span key={t} className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-[8px] font-bold text-zinc-400 rounded-full">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}

                            {c.comment && (
                              <p className="text-xs text-zinc-300 font-light italic mt-0.5">"{c.comment}"</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
