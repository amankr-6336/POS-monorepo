import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Badge, Button, Modal } from "@pos/ui";
import {
  ShieldCheck,
  Filter,
  RefreshCw,
  Ban,
  AlertTriangle,
  Tag,
  Percent,
  Eye,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import { API_BASE_URL } from "../config";

interface AuditLogEntry {
  _id: string;
  restaurantId: string;
  staffId?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  staffName?: string;
  action: "item_cancelled" | "order_cancelled" | "discount_applied" | "price_overridden" | string;
  entityType: string;
  entityId: string;
  reason?: string;
  note?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export default function AuditLogs() {
  const { user, accessToken } = useAuthStore();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/restaurants/${user?.restaurantId}/staff`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setStaffList(await res.json());
      }
    } catch (err) {
      console.error("Failed to load staff list:", err);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (actionFilter !== "all") queryParams.append("action", actionFilter);
      if (staffFilter !== "all") queryParams.append("staffId", staffFilter);
      queryParams.append("page", page.toString());
      queryParams.append("limit", "20");

      const res = await fetch(
        `${API_BASE_URL}/restaurants/${user?.restaurantId}/audit-logs?${queryParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setLogs(data.auditLogs || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.restaurantId) {
      fetchStaff();
    }
  }, [user?.restaurantId]);

  useEffect(() => {
    if (user?.restaurantId) {
      fetchAuditLogs();
    }
  }, [user?.restaurantId, actionFilter, staffFilter, page]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "item_cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/50 shadow-sm">
            <Ban className="w-3 h-3 text-rose-400" />
            Item Cancelled
          </span>
        );
      case "order_cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-950/80 text-red-300 border border-red-700/60 shadow-sm">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            Order Cancelled
          </span>
        );
      case "discount_applied":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/50 shadow-sm">
            <Percent className="w-3 h-3 text-amber-400" />
            Discount Applied
          </span>
        );
      case "price_overridden":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-950/60 text-violet-300 border border-violet-800/50 shadow-sm">
            <Tag className="w-3 h-3 text-violet-400" />
            Price Overridden
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            {action}
          </span>
        );
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "owner":
        return <Badge variant="warning">Owner</Badge>;
      case "manager":
        return <Badge variant="info">Manager</Badge>;
      case "waiter":
        return <Badge variant="neutral">Waiter</Badge>;
      case "chef":
        return <Badge variant="preparing">Chef</Badge>;
      default:
        return <Badge variant="neutral">{role || "Staff"}</Badge>;
    }
  };

  const itemCancelCount = logs.filter((l) => l.action === "item_cancelled").length;
  const orderCancelCount = logs.filter((l) => l.action === "order_cancelled").length;

  return (
    <div className="flex flex-col gap-6 text-zinc-100 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Staff Audit Trail</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Immutable, tamper-evident record of staff cancellations, price overrides, and sensitive actions
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchAuditLogs}
          disabled={loading}
          className="self-start md:self-auto text-xs border-zinc-800 text-zinc-300 hover:text-white flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Logs</span>
        </Button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Total Audited Events</span>
          <span className="text-2xl font-black text-white">{totalCount}</span>
          <span className="text-[10px] text-zinc-500">Recorded across staff operations</span>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Item Cancellations</span>
          <span className="text-2xl font-black text-rose-300">{itemCancelCount}</span>
          <span className="text-[10px] text-zinc-500">Inventory stock auto-reverted</span>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">Order Cancellations</span>
          <span className="text-2xl font-black text-red-300">{orderCancelCount}</span>
          <span className="text-[10px] text-zinc-500">Whole tickets voided & alerted</span>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider">Monitored Staff</span>
          <span className="text-2xl font-black text-violet-300">{staffList.length}</span>
          <span className="text-[10px] text-zinc-500">Active accounts tracked</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-semibold">
            <Filter className="w-3.5 h-3.5 text-violet-400" />
            <span>Filters:</span>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-zinc-500">Action:</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 transition-colors"
            >
              <option value="all">All Actions</option>
              <option value="item_cancelled">Item Cancelled</option>
              <option value="order_cancelled">Order Cancelled</option>
              <option value="discount_applied">Discount Applied</option>
              <option value="price_overridden">Price Overridden</option>
            </select>
          </div>

          {/* Staff Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-zinc-500">Staff Member:</label>
            <select
              value={staffFilter}
              onChange={(e) => {
                setStaffFilter(e.target.value);
                setPage(1);
              }}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 transition-colors max-w-[200px]"
            >
              <option value="all">All Staff Members</option>
              {staffList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs text-zinc-400 font-mono">
          Showing {logs.length} of {totalCount} events
        </span>
      </div>

      {/* Logs Table / List */}
      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 overflow-hidden shadow-sm">
        {loading ? (
          <div className="min-h-[300px] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="min-h-[260px] flex flex-col items-center justify-center p-8 text-center text-zinc-500">
            <ShieldCheck className="w-10 h-10 text-zinc-600 mb-2 stroke-[1.5]" />
            <h3 className="text-sm font-bold text-zinc-300">No Audit Events Found</h3>
            <p className="text-xs max-w-sm mt-1">
              No sensitive staff actions match your current filter criteria. Actions will appear here automatically when
              items/orders are cancelled or adjusted.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-850/80 bg-zinc-950/60 text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="p-3.5 pl-5">Timestamp</th>
                  <th className="p-3.5">Staff Member</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Entity / Target</th>
                  <th className="p-3.5">Reason & Note</th>
                  <th className="p-3.5 text-right pr-5">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/60 text-zinc-300">
                {logs.map((log) => {
                  const staffRole = log.staffId?.role;
                  const staffName = log.staffId?.name || log.staffName || "System / Guest";
                  const targetLabel = log.metadata?.tableLabel || "Table";
                  const itemName = log.metadata?.itemName;

                  return (
                    <tr key={log._id} className="hover:bg-zinc-900/40 transition-colors">
                      {/* Timestamp */}
                      <td className="p-3.5 pl-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono text-zinc-200 font-semibold">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {/* Staff Member */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-violet-950/60 border border-violet-800/40 flex items-center justify-center text-[11px] font-bold text-violet-300">
                            {staffName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-200">{staffName}</span>
                            <div className="mt-0.5">{getRoleBadge(staffRole)}</div>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="p-3.5 whitespace-nowrap">{getActionBadge(log.action)}</td>

                      {/* Entity / Target */}
                      <td className="p-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-200">
                            {targetLabel} {itemName ? `• ${itemName}` : ""}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[150px]">
                            {log.entityType} #{log.entityId.slice(-6)}
                          </span>
                        </div>
                      </td>

                      {/* Reason & Note */}
                      <td className="p-3.5 max-w-xs">
                        <div className="flex flex-col gap-1">
                          {log.reason && (
                            <span className="inline-block self-start px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700 capitalize">
                              {log.reason}
                            </span>
                          )}
                          {log.note && (
                            <p className="text-[11px] text-zinc-400 italic line-clamp-2">"{log.note}"</p>
                          )}
                        </div>
                      </td>

                      {/* View Details */}
                      <td className="p-3.5 text-right pr-5 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="text-[11px] py-1 px-2.5 rounded-lg border-zinc-800 text-zinc-400 hover:text-white flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5 text-violet-400" />
                          <span>Inspect</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3.5 bg-zinc-950/60 border-t border-zinc-850 flex items-center justify-between text-xs text-zinc-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="text-xs border-zinc-850 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="text-xs border-zinc-850 disabled:opacity-40"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Metadata Inspector Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Audit Entry Inspector"
        >
          <div className="flex flex-col gap-4 text-xs text-zinc-200">
            {/* Summary card */}
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Action</span>
                <div className="mt-0.5">{getActionBadge(selectedLog.action)}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Timestamp</span>
                <div className="text-xs font-mono text-zinc-300 mt-0.5">
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Staff & Context */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-mono">Operator</span>
                <p className="font-bold text-zinc-200 mt-1">
                  {selectedLog.staffId?.name || selectedLog.staffName || "System / Guest"}
                </p>
                {selectedLog.staffId?.email && (
                  <p className="text-[10px] text-zinc-400 font-mono">{selectedLog.staffId.email}</p>
                )}
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-mono">Entity Target</span>
                <p className="font-bold text-zinc-200 mt-1">
                  {selectedLog.metadata?.tableLabel || "Table"}{" "}
                  {selectedLog.metadata?.itemName ? `• ${selectedLog.metadata.itemName}` : ""}
                </p>
                <p className="text-[10px] text-zinc-400 font-mono">
                  {selectedLog.entityType} ID: {selectedLog.entityId}
                </p>
              </div>
            </div>

            {/* Reason & Note */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-1.5">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Mandatory Reason & Note</span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/60 capitalize">
                  {selectedLog.reason || "None recorded"}
                </span>
              </div>
              {selectedLog.note && (
                <p className="text-xs text-zinc-300 mt-1 bg-zinc-950 p-2.5 rounded-lg border border-zinc-850 italic">
                  "{selectedLog.note}"
                </p>
              )}
            </div>

            {/* Restored Ingredients if available */}
            {selectedLog.metadata?.restoredIngredients && selectedLog.metadata.restoredIngredients.length > 0 && (
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                  <Package className="w-4 h-4" />
                  <span>Automatic Inventory Reversal</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {selectedLog.metadata.restoredIngredients.map((ing: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-between text-[11px]"
                    >
                      <span className="text-zinc-300 font-medium">{ing.name}</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        +{ing.quantityRestored} {ing.unit || ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Metadata JSON view */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Raw Event Metadata</span>
              <pre className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 text-[10px] font-mono text-zinc-400 overflow-x-auto max-h-40">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>

            <div className="pt-2 border-t border-zinc-850 flex justify-end">
              <Button size="sm" onClick={() => setSelectedLog(null)} className="text-xs">
                Close Inspector
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
