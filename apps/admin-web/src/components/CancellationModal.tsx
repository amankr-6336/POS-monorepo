import { useState } from "react";
import { Modal, Button } from "@pos/ui";
import { AlertTriangle, RotateCcw, XCircle } from "lucide-react";
import { CANCELLATION_REASONS } from "@pos/types";

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, note?: string) => Promise<void>;
  title?: string;
  itemDescription?: string;
  isWholeOrder?: boolean;
}

export default function CancellationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Cancellation",
  itemDescription,
  isWholeOrder = false,
}: CancellationModalProps) {
  const [reason, setReason] = useState<string>("customer changed mind");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!reason || !reason.trim()) {
      setError("Please select a mandatory cancellation reason.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(reason, note.trim());
      onClose();
      setNote("");
      setReason("customer changed mind");
    } catch (err: any) {
      setError(err.message || "Failed to cancel.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) {
          onClose();
          setError(null);
        }
      }}
      title={title}
    >
      <div className="flex flex-col gap-4 text-zinc-200">
        <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-red-200">
              {isWholeOrder ? "Cancelling Entire Order" : "Cancelling Order Item"}
            </h4>
            <p className="text-red-300/80 mt-0.5">
              {itemDescription ? (
                <span>
                  Target: <strong>{itemDescription}</strong>
                  <br />
                </span>
              ) : null}
              Stock deduction will be reversed automatically and an immutable audit log entry will be recorded.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-200 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Reason Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
            <span>
              Cancellation Reason <span className="text-red-400">*</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-normal">Required</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500 transition-colors capitalize"
          >
            {CANCELLATION_REASONS.map((r) => (
              <option key={r} value={r} className="bg-zinc-900 text-zinc-200">
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Free-text Note */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
            <span>Additional Free-Text Note</span>
            <span className="text-[10px] text-zinc-500 font-normal">Optional</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Guest had to rush out, kitchen ran out of ingredients, order mistakenly duplicated..."
            rows={3}
            disabled={submitting}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-850">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="text-xs border-zinc-800 text-zinc-400 hover:text-white"
          >
            Keep Order
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={submitting}
            className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-red-600/20"
          >
            {submitting ? (
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            <span>{submitting ? "Processing..." : isWholeOrder ? "Cancel Whole Order" : "Cancel Item"}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
