import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Button, Badge, Modal } from "@pos/ui";
import { formatCurrency, formatDate } from "@pos/utils";
import { Receipt, Check, ArrowRight, Printer, ShieldCheck, Trash } from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api/v1";

export default function Orders() {
  const { user, accessToken } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Bill Modal details
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [billDetails, setBillDetails] = useState<any>(null);
  const [billModalOpen, setBillModalOpen] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/restaurants/${user?.restaurantId}/orders`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.restaurantId) fetchOrders();
  }, [user?.restaurantId]);

  const handleAdvanceStatus = async (orderId: string, currentStatus: string) => {
    let nextStatus = "";
    if (currentStatus === "placed") nextStatus = "confirmed";
    else if (currentStatus === "confirmed") nextStatus = "preparing";
    else if (currentStatus === "preparing") nextStatus = "ready";
    else if (currentStatus === "ready") nextStatus = "served";

    if (!nextStatus) return;

    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update order status");
      }

      fetchOrders();
    } catch (err: any) {
      alert(err.message || "Something went wrong.");
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order? It will restore any deducted stock.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenBillDetails = async (order: any) => {
    setActiveOrder(order);
    try {
      // 1. Generate or fetch existing bill
      const res = await fetch(`${API_BASE_URL}/orders/${order._id}/generate-bill`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const b = await res.json();
        setBillDetails(b);
        setBillModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettlePayment = async () => {
    if (!billDetails) return;
    try {
      const res = await fetch(`${API_BASE_URL}/bills/${billDetails._id}/settle`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        alert("Payment settled externally! Table session has been closed.");
        setBillModalOpen(false);
        setActiveOrder(null);
        setBillDetails(null);
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "placed": return <Badge variant="neutral">Placed</Badge>;
      case "confirmed": return <Badge variant="info">Confirmed</Badge>;
      case "preparing": return <Badge variant="preparing">Preparing</Badge>;
      case "ready": return <Badge variant="ready">Ready</Badge>;
      case "served": return <Badge variant="success">Served</Badge>;
      case "billed": return <Badge variant="success" className="bg-emerald-600 text-white">Billed</Badge>;
      case "cancelled": return <Badge variant="error">Cancelled</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Active Orders</h1>
        <p className="text-zinc-400 text-sm mt-1">Track guest orders, generate bills, and clear tables</p>
      </div>

      {/* Orders Grid */}
      <div className="overflow-x-auto border border-zinc-900 rounded-2xl bg-zinc-900/10">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-900 text-zinc-400 text-xs font-semibold uppercase bg-zinc-950/40">
              <th className="p-4">Table</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Items Summary</th>
              <th className="p-4">Total</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/60 text-zinc-300">
            {orders.map((o) => (
              <tr key={o._id} className="hover:bg-zinc-900/10 transition-colors">
                <td className="p-4 font-bold text-white text-xs">{(o.tableId as any)?.label || "Table"}</td>
                <td className="p-4 text-xs">
                  <div>
                    <h4 className="font-bold text-zinc-200">{(o.customerId as any)?.name}</h4>
                    <span className="text-[10px] text-zinc-500 font-mono">{(o.customerId as any)?.mobileNumber}</span>
                  </div>
                </td>
                <td className="p-4 text-xs font-light max-w-xs truncate">
                  {o.items.map((i: any) => `${i.name} (x${i.quantity})`).join(", ")}
                </td>
                <td className="p-4 text-xs font-bold text-violet-400 font-mono">{formatCurrency(o.total)}</td>
                <td className="p-4">{getStatusBadge(o.status)}</td>
                
                <td className="p-4 text-right flex justify-end gap-2 items-center">
                  {/* Status advancer */}
                  {["placed", "confirmed", "preparing", "ready"].includes(o.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAdvanceStatus(o._id, o.status)}
                      className="text-[10px] rounded-lg px-2.5 py-1 text-zinc-300 border border-zinc-800 hover:bg-zinc-850 flex items-center gap-1.5 font-semibold"
                    >
                      {o.status === "placed" && "Accept"}
                      {o.status === "confirmed" && "Start cooking"}
                      {o.status === "preparing" && "Mark Ready"}
                      {o.status === "ready" && "Deliver Food"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  )}

                  {/* Bill generator */}
                  {(o.status === "served" || o.status === "billed") && (
                    <Button
                      size="sm"
                      onClick={() => handleOpenBillDetails(o)}
                      className="text-[10px] rounded-lg px-2.5 py-1 bg-violet-600 hover:bg-violet-750 text-white font-bold flex items-center gap-1.5 shadow-md shadow-violet-500/10"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      {o.status === "billed" ? "Invoice / Settle" : "Generate Bill"}
                    </Button>
                  )}

                  {/* Cancel button */}
                  {["placed", "confirmed", "preparing"].includes(o.status) && (
                    <button
                      onClick={() => handleCancelOrder(o._id)}
                      className="p-1.5 rounded-lg border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bill receipt Settlement Modal */}
      {billDetails && activeOrder && (
        <Modal isOpen={billModalOpen} onClose={() => setBillModalOpen(false)} title={`Bill Invoice — Table ${(activeOrder.tableId as any)?.label}`}>
          <div className="flex flex-col gap-5 pr-1">
            
            {/* Printable Receipt layout */}
            <div className="border border-zinc-850 p-6 rounded-2xl bg-zinc-950 shadow-inner relative flex flex-col gap-4">
              <div className="absolute top-0 inset-x-0 h-1 bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,#1f2937_4px,#1f2937_8px)] opacity-50"></div>
              
              <div className="text-center border-b border-zinc-900 border-dashed pb-4 mt-2">
                <h3 className="font-extrabold text-white text-base tracking-tight uppercase">Gourmet Garden POS</h3>
                <p className="text-[10px] text-zinc-500 mt-1">Generated: {formatDate(billDetails.generatedAt)}</p>
              </div>

              {/* Items */}
              <div className="flex flex-col gap-2.5">
                {billDetails.items.map((i: any) => (
                  <div key={i.menuItemId} className="flex justify-between text-xs">
                    <span className="text-zinc-300">
                      {i.name} <span className="text-zinc-500 font-medium">x{i.quantity}</span>
                    </span>
                    <span className="text-white font-mono font-semibold">{formatCurrency(i.price * i.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Math */}
              <div className="border-t border-zinc-900 border-dashed pt-4 flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(billDetails.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Tax (5% GST)</span>
                  <span className="font-mono">{formatCurrency(billDetails.tax)}</span>
                </div>
                <div className="flex justify-between text-sm text-white font-extrabold pt-2 border-t border-zinc-900 mt-1">
                  <span>Total Due</span>
                  <span className="text-violet-400 font-mono">{formatCurrency(billDetails.total)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                >
                  <Printer className="w-4 h-4" /> Print Thermal Fallback
                </Button>
                
                {billDetails.paymentStatus === "pending" ? (
                  <Button
                    onClick={handleSettlePayment}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl py-2.5 font-bold shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Settle Payment
                  </Button>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Settled Externally
                  </div>
                )}
              </div>

              {billDetails.paymentStatus === "pending" && (
                <span className="text-[10px] text-zinc-500 text-center leading-normal mt-2">
                  Payment is collected externally (Cash / Card machine). Settle Payment here once payment has been received to release Table {(activeOrder.tableId as any)?.label}.
                </span>
              )}
            </div>

          </div>
        </Modal>
      )}
    </div>
  );
}
