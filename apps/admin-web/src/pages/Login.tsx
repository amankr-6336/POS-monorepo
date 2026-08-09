import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { Button, Input, Card } from "@pos/ui";

const API_BASE_URL = "http://localhost:5000/api/v1";

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Invalid credentials");
      }

      const data = await res.json();
      setAuth(data.accessToken, data.user);
      
      // Redirect based on role
      if (data.user.role === "chef") {
        navigate("/kds");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/20 via-zinc-950 to-zinc-950 -z-10" />

      <Card className="w-full max-w-md bg-zinc-900/60 backdrop-blur-md border-zinc-800 p-8 shadow-2xl">
        <div className="text-center pb-6 border-b border-zinc-800/80">
          <div className="w-12 h-12 bg-violet-600/10 border border-violet-500/20 rounded-full flex items-center justify-center mx-auto text-violet-400 text-xl font-bold mb-3">
            🏢
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Staff Portal</h1>
          <p className="text-zinc-400 text-xs mt-1.5 font-light">Login with your staff account details</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            label="Email Address"
            placeholder="name@restaurant.com"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            disabled={loading}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            disabled={loading}
          />

          {error && <p className="text-xs text-red-500 text-center font-medium">{error}</p>}

          <Button type="submit" className="w-full mt-2 py-3" disabled={loading}>
            {loading ? "Authenticating..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-8 text-center text-[10px] text-zinc-500 leading-relaxed">
          Demo Accounts:<br />
          Owner: <span className="text-zinc-400">owner@gourmet.com</span> • Chef: <span className="text-zinc-400">chef@gourmet.com</span><br />
          Waiter: <span className="text-zinc-400">waiter@gourmet.com</span> • Password: <span className="text-zinc-400">password</span>
        </div>
      </Card>
    </div>
  );
}
