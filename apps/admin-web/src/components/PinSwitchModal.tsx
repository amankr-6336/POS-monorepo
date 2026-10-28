import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { Button, Badge, Modal, Input } from "@pos/ui";
import { KeyRound, ShieldAlert, Check, Delete, Lock, UserCheck, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "../config";

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: "owner" | "manager" | "waiter" | "chef";
  assignedStation?: string;
  hasPin: boolean;
  isLocked: boolean;
  lockedUntil?: string | null;
}

interface PinSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PinSwitchModal({ isOpen, onClose }: PinSwitchModalProps) {
  const { user, accessToken, setAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  // Set PIN tab/mode
  const [mode, setMode] = useState<"switch" | "set_pin">("switch");
  const [targetConfigureStaffId, setTargetConfigureStaffId] = useState<string>("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [setPinMessage, setSetPinMessage] = useState("");

  const fetchStaff = async () => {
    if (!user?.restaurantId) return;
    setLoadingList(true);
    try {
      const res = await fetch(`${API_BASE_URL}/restaurants/${user.restaurantId}/staff`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error("Failed to load staff list:", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStaff();
      setPin("");
      setError("");
      setSuccess("");
      setSelectedStaff(null);
      setMode("switch");
      if (user?.id) {
        setTargetConfigureStaffId(user.id);
      }
    }
  }, [isOpen]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const updated = pin + num;
      setPin(updated);
      setError("");
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  const handleClear = () => {
    setPin("");
    setError("");
  };

  const handleSwitchSubmit = async () => {
    if (!selectedStaff) {
      setError("Please select a staff member first");
      return;
    }
    if (pin.length < 4 || pin.length > 6) {
      setError("PIN must be 4 to 6 digits");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/switch-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          staffId: selectedStaff._id,
          pin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to authenticate PIN");
        setPin("");
        // Refresh staff list to update lock status if needed
        fetchStaff();
        return;
      }

      setSuccess(`Switched active staff to ${data.user.name}`);
      setAuth(data.accessToken, data.user);
      setTimeout(() => {
        onClose();
        const newRole = data.user.role;
        const currentPath = location.pathname;
        if (["/dashboard", "/ratings"].includes(currentPath) && ["waiter", "chef"].includes(newRole)) {
          navigate(newRole === "waiter" ? "/tables" : "/kds");
        } else if (currentPath === "/tables" && newRole === "chef") {
          navigate("/kds");
        }
      }, 700);
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin.match(/^\d{4,6}$/)) {
      setSetPinMessage("PIN must be 4 to 6 digits");
      return;
    }
    if (newPin !== confirmNewPin) {
      setSetPinMessage("PINs do not match");
      return;
    }

    setLoading(true);
    setSetPinMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/set-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          staffId: targetConfigureStaffId || user?.id,
          pin: newPin,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSetPinMessage("PIN updated successfully! You can now use it for fast switching.");
        setNewPin("");
        setConfirmNewPin("");
        fetchStaff();
        setTimeout(() => setMode("switch"), 1500);
      } else {
        setSetPinMessage(data.message || "Failed to update PIN");
      }
    } catch (err: any) {
      setSetPinMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Terminal Staff Switcher" size="lg">
      <div className="flex flex-col gap-5">
        {/* Top Mode Selector */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMode("switch");
                setError("");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === "switch"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" /> Fast PIN Switch
            </button>
            <button
              onClick={() => {
                setMode("set_pin");
                setSetPinMessage("");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === "set_pin"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Configure My PIN
            </button>
          </div>

          <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Terminal Trusted Session
          </div>
        </div>

        {mode === "switch" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Staff Selection List */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Select Staff Member
                </span>
                <button
                  onClick={fetchStaff}
                  className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="Refresh staff"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? "animate-spin" : ""}`} />
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                {staffList.map((s) => {
                  const isSelected = selectedStaff?._id === s._id;
                  const isCurrent = user?.id === s._id;

                  return (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => {
                        setSelectedStaff(s);
                        setPin("");
                        setError("");
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-violet-950/40 border-violet-500 shadow-md shadow-violet-500/10 text-white"
                          : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs uppercase ${
                            isSelected ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-300"
                          }`}
                        >
                          {s.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold">{s.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-semibold">
                                Active
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 capitalize">{s.role}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {s.isLocked ? (
                          <Badge variant="error" className="text-[9px]">Locked</Badge>
                        ) : !s.hasPin ? (
                          <span className="text-[9px] text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                            No PIN
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500 font-mono">••••</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: PIN Keypad */}
            <div className="flex flex-col items-center justify-center bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-4 min-h-[360px]">
              {selectedStaff ? (
                !selectedStaff.hasPin ? (
                  <div className="w-full flex flex-col items-center gap-3 p-6 text-center max-w-[260px]">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">No PIN Configured</h4>
                      <p className="text-xs text-zinc-400 mt-1">
                        {selectedStaff.name} has not set up a quick-switch PIN yet.
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setTargetConfigureStaffId(selectedStaff._id);
                        setMode("set_pin");
                        setSetPinMessage("");
                      }}
                      className="mt-2 py-2 px-4 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white w-full"
                    >
                      Set PIN for {selectedStaff.name.split(" ")[0]}
                    </Button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center gap-4">
                    <div className="text-center">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Enter PIN for {selectedStaff.name}
                      </h4>
                      <span className="text-[10px] text-zinc-500 capitalize">{selectedStaff.role}</span>
                    </div>

                  {/* PIN Display Dots */}
                  <div className="flex gap-2.5 my-1">
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <div
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full border transition-all ${
                          idx < pin.length
                            ? "bg-violet-500 border-violet-400 scale-110 shadow-sm shadow-violet-500/50"
                            : "bg-zinc-950 border-zinc-700"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Error & Success Messages */}
                  {error && (
                    <div className="w-full p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center flex items-center justify-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="w-full p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs text-center flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{success}</span>
                    </div>
                  )}

                  {/* Keypad Grid (3x4) */}
                  <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleKeyPress(num)}
                        disabled={loading}
                        className="h-12 bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white font-extrabold text-base rounded-xl border border-zinc-800 transition-all flex items-center justify-center"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={loading}
                      className="h-12 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 text-xs font-bold rounded-xl border border-zinc-800 transition-all flex items-center justify-center"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeyPress("0")}
                      disabled={loading}
                      className="h-12 bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white font-extrabold text-base rounded-xl border border-zinc-800 transition-all flex items-center justify-center"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleBackspace}
                      disabled={loading}
                      className="h-12 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 rounded-xl border border-zinc-800 transition-all flex items-center justify-center"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  </div>

                  <Button
                    onClick={handleSwitchSubmit}
                    disabled={loading || pin.length < 4}
                    className="w-full max-w-[240px] mt-2 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
                  >
                    <UserCheck className="w-4 h-4" />
                    {loading ? "Verifying..." : "Switch Active User"}
                  </Button>
                </div>
                )
              ) : (
                <div className="text-center p-6 text-zinc-500">
                  <KeyRound className="w-8 h-8 mx-auto mb-2 opacity-40 text-violet-400" />
                  <p className="text-xs font-medium">Select a staff member from the left to unlock via PIN</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Mode: Configure Staff PIN */
          <form onSubmit={handleSetPinSubmit} className="flex flex-col gap-4 max-w-md mx-auto w-full py-4">
            <div className="text-center">
              <h3 className="font-bold text-white text-base">
                Configure PIN {targetConfigureStaffId ? `for ${staffList.find(s => s._id === targetConfigureStaffId)?.name || user?.name}` : `for ${user?.name}`}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Set a 4 to 6 digit numerical PIN for quick switching</p>
            </div>

            {["owner", "manager"].includes(user?.role || "") && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-300">Target Staff Member</label>
                <select
                  value={targetConfigureStaffId}
                  onChange={(e) => setTargetConfigureStaffId(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.role}) {s._id === user?.id ? "— (You)" : ""} {!s.hasPin ? "[No PIN]" : "[PIN Set]"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Input
              label="New PIN (4-6 digits)"
              type="password"
              placeholder="e.g. 1234"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              required
            />

            <Input
              label="Confirm PIN"
              type="password"
              placeholder="Re-enter PIN"
              maxLength={6}
              value={confirmNewPin}
              onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ""))}
              required
            />

            {setPinMessage && (
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-center text-violet-300">
                {setPinMessage}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold">
              {loading ? "Saving..." : "Save PIN"}
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
}
