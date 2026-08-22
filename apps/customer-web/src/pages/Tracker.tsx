import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { useSessionStore } from "../store/useSessionStore";
import { Button, Card, Badge } from "@pos/ui";
import { formatCurrency, formatDate } from "@pos/utils";
import { ChevronLeft, Check, Receipt, Bell, Utensils } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import RatingPrompt from "../components/RatingPrompt";

import { API_BASE_URL, SOCKET_URL } from "../config";

export default function Tracker() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { restaurant, customerToken } = useSessionStore();

  const [order, setOrder] = useState<any>(null);
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [waiterCalled, setWaiterCalled] = useState(false);
  
  const [promptDismissed, setPromptDismissed] = useState(() => {
    return sessionStorage.getItem(`rating_dismissed_${orderId}`) === "true";
  });
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    if (order && (order.status === "served" || order.status === "billed") && !promptDismissed) {
      setShowRating(true);
    } else {
      setShowRating(false);
    }
  }, [order?.status, promptDismissed]);

  const handleCloseRating = () => {
    sessionStorage.setItem(`rating_dismissed_${orderId}`, "true");
    setPromptDismissed(true);
    setShowRating(false);
  };

  useEffect(() => {
    async function fetchOrderAndBill() {
      try {
        const orderRes = await fetch(`${API_BASE_URL}/public/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${customerToken}` },
        });

        if (orderRes.ok) {
          const ord = await orderRes.json();
          setOrder(ord);

          // If order is billed or served, fetch the bill details
          if (ord.status === "served" || ord.status === "billed") {
            const billRes = await fetch(`${API_BASE_URL}/public/orders/${orderId}/bill`, {
              headers: { Authorization: `Bearer ${customerToken}` },
            });
            if (billRes.ok) {
              const b = await billRes.json();
              setBill(b);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load tracking states:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrderAndBill();

    // Sockets listener for state progression
    const socket = io(SOCKET_URL);
    if (restaurant?.id) {
      socket.emit("join-restaurant", restaurant.id);
    }

    socket.on("order:statusChanged", (data: any) => {
      if (data.orderId === orderId) {
        fetchOrderAndBill();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId, restaurant?.id, customerToken]);

  const handleCallWaiter = async () => {
    if (waiterCalled) return;
    try {
      const res = await fetch(`${API_BASE_URL}/public/table-queries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ tableId: order?.tableId?._id }),
      });
      if (res.ok) {
        setWaiterCalled(true);
        setTimeout(() => setWaiterCalled(false), 30000);
        alert("Waiter signalled to your table!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
        <h2 className="text-xl font-bold text-white">Order Not Found</h2>
        <Button onClick={() => navigate("/menu")} className="mt-4">Back to Menu</Button>
      </div>
    );
  }

  // Lifecycle states
  const statuses = ["placed", "confirmed", "preparing", "ready", "served"];
  const currentStepIndex = statuses.indexOf(order.status);

  const getStepLabel = (status: string) => {
    switch (status) {
      case "placed": return "Order Placed";
      case "confirmed": return "Accepted";
      case "preparing": return "Preparing";
      case "ready": return "Ready for Delivery";
      case "served": return "Served";
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-20 px-4">
      {/* Header */}
      <header className="max-w-md mx-auto pt-6 flex items-center justify-between no-print">
        <button
          onClick={() => navigate("/menu")}
          className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Menu
        </button>
        <span className="text-zinc-500 text-xs font-mono">ID: #{order._id.slice(-6).toUpperCase()}</span>
      </header>

      <main className="max-w-md mx-auto mt-6 flex flex-col gap-6">
        {/* Status card */}
        <Card className="p-6 bg-zinc-900/40 border-zinc-900 shadow-xl no-print">
          <div className="text-center">
            {order.status === "cancelled" ? (
              <div>
                <Badge variant="error" className="py-1 px-3">Order Cancelled</Badge>
                <p className="text-zinc-400 text-sm mt-3">This order was cancelled by the staff.</p>
              </div>
            ) : (
              <div>
                <div className="w-12 h-12 bg-violet-600/10 border border-violet-500/20 rounded-full flex items-center justify-center mx-auto text-violet-400 mb-3">
                  <Utensils className="w-5 h-5 animate-pulse" />
                </div>
                <h2 className="text-lg font-extrabold text-white">
                  {order.status === "ready" ? "Your Food is Ready! 🎉" : order.status === "served" ? "Enjoy Your Meal! 🍽️" : "Preparing Deliciousness..."}
                </h2>
                <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed font-light">
                  Active tracking table <span className="text-white font-medium">{order.tableId?.label}</span>
                </p>
              </div>
            )}
          </div>

          {/* Stepper tracker */}
          {order.status !== "cancelled" && (
            <div className="mt-8 flex flex-col gap-5 pl-4 relative border-l border-zinc-800">
              {statuses.map((stepStatus, idx) => {
                const isPassed = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <div key={stepStatus} className="flex items-center gap-4 relative">
                    {/* Circle Node */}
                    <div
                      className={`absolute -left-[25px] w-4.5 h-4.5 rounded-full flex items-center justify-center border text-[9px] font-bold transition-all ${
                        isPassed
                          ? "bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-600/20"
                          : "bg-zinc-950 border-zinc-800 text-zinc-600"
                      }`}
                    >
                      {isPassed && !isCurrent ? <Check className="w-2.5 h-2.5" /> : idx + 1}
                    </div>

                    {/* Step label */}
                    <div className="pl-3">
                      <span className={`text-xs font-semibold uppercase tracking-wider block ${isCurrent ? "text-violet-400 font-bold" : isPassed ? "text-zinc-200" : "text-zinc-600"}`}>
                        {getStepLabel(stepStatus)}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] text-zinc-400 font-light block mt-0.5 animate-pulse">
                          {stepStatus === "placed" && "Waiting for restaurant verification..."}
                          {stepStatus === "confirmed" && "Order accepted by kitchen."}
                          {stepStatus === "preparing" && "Chef Mario is crafting your items."}
                          {stepStatus === "ready" && "Waiter Sarah is delivering to your table."}
                          {stepStatus === "served" && "All items served."}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Floating Call Waiter inside tracker */}
        <Button
          variant="glass"
          onClick={handleCallWaiter}
          disabled={waiterCalled}
          className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl shadow-lg no-print"
        >
          <Bell className="w-4 h-4 text-amber-400" />
          {waiterCalled ? "Signalled Waiter" : "Need Assistance? Call Waiter"}
        </Button>

        {/* Bill Receipt display */}
        {bill && (
          <Card className="p-6 bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden relative">
            {/* receipt pattern */}
            <div className="absolute top-0 inset-x-0 h-1 bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,#1f2937_4px,#1f2937_8px)] opacity-50"></div>
            
            <div className="text-center pb-4 border-b border-zinc-800 border-dashed mt-2">
              <Receipt className="w-8 h-8 mx-auto text-zinc-500 mb-2" />
              <h3 className="font-extrabold text-white tracking-tight uppercase">Order Bill Receipt</h3>
              <p className="text-[10px] text-zinc-400 font-light mt-1">Generated: {formatDate(bill.generatedAt)}</p>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {bill.items.map((item: any) => (
                <div key={item.menuItemId} className="flex justify-between text-xs">
                  <span className="text-zinc-300">
                    {item.name} <span className="text-zinc-500 font-medium">x{item.quantity}</span>
                  </span>
                  <span className="text-white font-semibold font-mono">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-800 border-dashed flex flex-col gap-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(bill.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Tax (5% GST)</span>
                <span className="font-mono">{formatCurrency(bill.tax)}</span>
              </div>
              <div className="flex justify-between text-sm text-white font-extrabold pt-2 border-t border-zinc-900 mt-1">
                <span>Total Amount</span>
                <span className="text-violet-400 font-mono">{formatCurrency(bill.total)}</span>
              </div>
            </div>

            {/* Print trigger and Status */}
            <div className="mt-6 flex flex-col gap-2 no-print">
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-950 rounded-xl border border-zinc-900">
                <span className="text-xs text-zinc-400">Payment Status</span>
                <Badge variant={bill.paymentStatus === "settled_externally" ? "success" : "warning"}>
                  {bill.paymentStatus === "settled_externally" ? "Paid (External)" : "Pending Settlement"}
                </Badge>
              </div>

              <Button
                variant="outline"
                onClick={() => window.print()}
                className="w-full text-xs font-semibold py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300"
              >
                Print Receipt Fallback
              </Button>
            </div>
          </Card>
        )}

        {/* Order Details items card (non-print reference) */}
        {!bill && (
          <Card className="p-5 bg-zinc-900/30 border-zinc-900/60 no-print">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Order Summary</h3>
            <div className="flex flex-col gap-2">
              {order.items.map((i: any) => (
                <div key={i.menuItemId} className="flex justify-between text-xs">
                  <span className="text-zinc-300">
                    {i.name} <span className="text-zinc-500">x{i.quantity}</span>
                  </span>
                  <span className="text-zinc-400 font-mono">{formatCurrency(i.price * i.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-zinc-900 pt-2 mt-2 flex justify-between text-xs font-bold">
                <span className="text-zinc-400">Est. Total</span>
                <span className="text-violet-400 font-mono">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </Card>
        )}
      </main>

      <AnimatePresence>
        {showRating && (
          <RatingPrompt
            order={order}
            customerToken={customerToken}
            onClose={handleCloseRating}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
