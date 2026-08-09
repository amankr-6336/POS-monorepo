import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSessionStore } from "../store/useSessionStore";
import { Button, Input, Card } from "@pos/ui";

const API_BASE_URL = "http://localhost:5000/api/v1";

export default function QRResolve() {
  const { slug, qrToken } = useParams<{ slug: string; qrToken: string }>();
  const navigate = useNavigate();
  const { setSession, setCustomer } = useSessionStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantData, setRestaurantData] = useState<any>(null);
  const [tableData, setTableData] = useState<any>(null);

  // Form states
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function resolveQR() {
      try {
        const response = await fetch(`${API_BASE_URL}/public/r/${slug}/t/${qrToken}`);
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || "Failed to resolve table QR link.");
        }
        const data = await response.json();
        setRestaurantData(data.restaurant);
        setTableData(data.table);
        setSession(data.restaurant, data.table);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
        setLoading(false);
      }
    }
    resolveQR();
  }, [slug, qrToken, setSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || name.length < 2) {
      setFormError("Name must be at least 2 characters.");
      return;
    }
    if (!/^\d{10}$/.test(mobileNumber)) {
      setFormError("Mobile number must be a valid 10-digit number.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/public/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mobileNumber,
          tableId: tableData.id,
          restaurantId: restaurantData.id,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to save details");
      }

      const data = await response.json();
      setCustomer(data.customer, data.customerToken);
      navigate("/menu");
    } catch (err: any) {
      setFormError(err.message || "Failed to initiate session.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-6">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-zinc-400 font-medium">Resolving your table info...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 text-2xl font-bold">!</div>
        <h2 className="mt-4 text-xl font-bold text-white">Oops! Scan Failed</h2>
        <p className="mt-2 text-zinc-400 max-w-sm">{error}</p>
        <p className="mt-4 text-xs text-zinc-500">Please try scanning the QR code on your table again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/20 via-zinc-950 to-zinc-950 -z-10" />

      <Card className="w-full max-w-md bg-zinc-900/80 backdrop-blur-md border-zinc-800">
        <div className="text-center pb-4 border-b border-zinc-800/60">
          {restaurantData?.logoUrl && (
            <img
              src={restaurantData.logoUrl}
              alt={restaurantData.name}
              className="w-16 h-16 rounded-2xl mx-auto border border-zinc-700/50 object-cover shadow-lg"
            />
          )}
          <h1 className="mt-3 text-2xl font-bold text-white">{restaurantData?.name}</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {tableData?.label} • {tableData?.location}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider text-center">
            Introduce Yourself
          </h2>

          <Input
            label="Your Name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
          />

          <Input
            label="Mobile Number"
            placeholder="9876543210"
            type="tel"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            disabled={submitting}
          />

          {formError && <p className="text-xs text-red-500 font-medium text-center">{formError}</p>}

          <Button type="submit" className="w-full mt-2" disabled={submitting}>
            {submitting ? "Opening Menu..." : "View Menu & Order"}
          </Button>

          <p className="text-[10px] text-zinc-500 text-center mt-2 leading-relaxed">
            Your details are used solely to tag order receipts and greet you back next time.
          </p>
        </form>
      </Card>
    </div>
  );
}
