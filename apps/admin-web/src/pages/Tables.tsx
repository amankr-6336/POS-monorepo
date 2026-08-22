import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Card, Button, Input, Modal, Badge } from "@pos/ui";
import { QrCode, RefreshCw, Plus, Users, Trash2 } from "lucide-react";

import { API_BASE_URL } from "../config";

export default function Tables() {
  const { user, accessToken } = useAuthStore();
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);

  // Form states
  const [label, setLabel] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [location, setLocation] = useState("Indoor");
  const [submitting, setSubmitting] = useState(false);

  const fetchTables = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/restaurants/${user?.restaurantId}/tables`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setTables(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.restaurantId) fetchTables();
  }, [user?.restaurantId]);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/restaurants/${user?.restaurantId}/tables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ label, capacity, location }),
      });

      if (res.ok) {
        setAddOpen(false);
        setLabel("");
        setCapacity(4);
        setLocation("Indoor");
        fetchTables();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (tableId: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/tables/${tableId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        fetchTables();
        if (selectedTable?._id === tableId) {
          const updated = await res.json();
          setSelectedTable(updated);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegenerateQR = async (tableId: string) => {
    if (!confirm("Regenerating the QR code will invalidate any printed codes on the table. Continue?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tables/${tableId}/regenerate-qr`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const updated = await res.json();
        if (selectedTable?._id === tableId) setSelectedTable(updated);
        fetchTables();
        alert("QR Code regenerated successfully!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm("Are you sure you want to delete this table?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tables/${tableId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setQrModalOpen(false);
        fetchTables();
      }
    } catch (err) {
      console.error(err);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Tables & QR Setup</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage physical layouts and print QR links</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 rounded-xl font-bold py-2.5">
          <Plus className="w-4 h-4" /> Add Table
        </Button>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tables.map((t) => (
          <Card
            key={t._id}
            onClick={() => {
              setSelectedTable(t);
              setQrModalOpen(true);
            }}
            className="cursor-pointer border-zinc-900 bg-zinc-900/20 hover:bg-zinc-900/60 transition-all p-5 flex flex-col justify-between min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-white text-base leading-none">{t.label}</h3>
                <Badge
                  variant={
                    t.status === "available"
                      ? "success"
                      : t.status === "occupied"
                      ? "info"
                      : t.status === "reserved"
                      ? "warning"
                      : "neutral"
                  }
                  className="py-0.5 px-2 text-[10px]"
                >
                  {t.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-[10px] text-zinc-400 font-light mt-1.5">Zone: {t.location}</p>
            </div>

            <div className="flex items-center justify-between pt-4 mt-2 border-t border-zinc-900/40">
              <span className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-zinc-400" /> Max {t.capacity}
              </span>
              <div className="p-1.5 bg-zinc-950 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-900">
                <QrCode className="w-4 h-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Table Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Create New Table">
        <form onSubmit={handleCreateTable} className="flex flex-col gap-4">
          <Input
            label="Table Label / Identifier"
            placeholder="T5, Patio 2, Bar A"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={submitting}
          />
          <Input
            label="Seating Capacity"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value))}
            disabled={submitting}
          />
          <Input
            label="Floor Location / Zone"
            placeholder="Indoor, Outdoor Patio, Main Bar"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={submitting}
          />

          <Button type="submit" className="w-full mt-4" disabled={submitting}>
            {submitting ? "Generating QR Code..." : "Create Table"}
          </Button>
        </form>
      </Modal>

      {/* QR Details / Config Modal */}
      {selectedTable && (
        <Modal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} title={`Table Configuration — ${selectedTable.label}`}>
          <div className="flex flex-col items-center gap-6">
            <div className="p-4 bg-white rounded-3xl border border-zinc-200 shadow-md max-w-[200px]">
              <img src={selectedTable.qrCodeUrl} alt="QR code" className="w-full object-contain" />
            </div>

            <div className="w-full flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quick Status Actions</span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedTable._id, "available")}
                  className={`text-[10px] ${selectedTable.status === "available" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : ""}`}
                >
                  Mark Available
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedTable._id, "needs_cleaning")}
                  className={`text-[10px] ${selectedTable.status === "needs_cleaning" ? "bg-zinc-800 border-zinc-700 text-zinc-300" : ""}`}
                >
                  Needs Cleaning
                </Button>
              </div>
            </div>

            <div className="w-full pt-4 border-t border-zinc-850 flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Administration Operations</span>
              <div className="flex gap-2">
                {/* Download QR */}
                <a
                  href={selectedTable.qrCodeUrl}
                  download={`QR_${selectedTable.label}.png`}
                  className="flex-1 text-center py-2.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl border border-zinc-700 flex items-center justify-center gap-1.5"
                >
                  Download QR PNG
                </a>
                
                {/* Regenerate QR */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegenerateQR(selectedTable._id)}
                  className="flex items-center gap-1 hover:text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </Button>

                {/* Delete table */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteTable(selectedTable._id)}
                  className="hover:bg-red-500/10 border-red-500/20 hover:border-red-500 text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
