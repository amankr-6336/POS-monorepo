import { useState } from "react";
import { Button, Input, Card, Badge } from "@pos/ui";
import { Sparkles, CheckCircle2, Send, QrCode, ClipboardList, Package, Receipt } from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api/v1";

export default function App() {
  const [name, setName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !restaurantName || !email || !phone || !message) {
      setError("Please fill out all contact fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, restaurantName, email, phone, message }),
      });

      if (res.ok) {
        setSuccess(true);
        setName("");
        setRestaurantName("");
        setEmail("");
        setPhone("");
        setMessage("");
      } else {
        throw new Error("Failed to submit inquiry.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit lead inquiry.");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      title: "Table QR Scanning",
      desc: "Customers scan per-table codes to view menus and place orders without installing any app.",
      icon: <QrCode className="w-5 h-5 text-violet-400" />,
    },
    {
      title: "Kitchen Routing (KDS)",
      desc: "Order items partition instantly into kitchen tickets routed directly to grill, bar, or tandoor chefs.",
      icon: <ClipboardList className="w-5 h-5 text-violet-400" />,
    },
    {
      title: "Recipe Stock Deduct",
      desc: "Confirming orders automatically deducts linked ingredient counts, flagging warnings on low inventory.",
      icon: <Package className="w-5 h-5 text-violet-400" />,
    },
    {
      title: "Thermal Print Bills",
      desc: "Itemizes subtotal, tax rates, and generates clean printable tickets for LAN or desktop browser runtimes.",
      icon: <Receipt className="w-5 h-5 text-violet-400" />,
    },
  ];

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen relative overflow-hidden select-none">
      {/* Background vectors */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] -z-10" />

      {/* Navigation Header */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-zinc-900/60">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-white tracking-tight">Gourmet POS</span>
          <Badge variant="info">Phase 1</Badge>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">Pricing</a>
          <a href="http://localhost:5173/login" className="text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2 rounded-xl transition-all">
            Staff Sign In &rarr;
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto text-center px-6 py-20 md:py-28 flex flex-col items-center">
        <Badge variant="success" className="py-1 px-3 bg-violet-500/10 border-violet-500/20 text-violet-400 rounded-full mb-6 font-bold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 fill-violet-400" /> Multi-Tenant POS Platform
        </Badge>
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none max-w-2xl">
          Smarter Ordering.<br />Faster Dining.
        </h1>
        <p className="text-zinc-400 text-sm md:text-base mt-6 max-w-lg leading-relaxed font-light">
          A zero-install PWA order experience for guests, paired with chef display routing, recipe inventory control, and thermal bill prints.
        </p>
        <div className="mt-8 flex gap-3">
          <a href="#contact" className="px-6 py-3 text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-violet-500/10 active:scale-[0.99] transition-all">
            Request Demo Sandbox
          </a>
          <a href="#features" className="px-6 py-3 text-sm font-semibold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all">
            Explore Features
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-16 border-t border-zinc-900/60">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Full System Modules</h2>
          <p className="text-zinc-500 text-xs mt-1">Core engines included in Gourmet POS Phase 1</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <Card key={i} className="p-6 bg-zinc-900/20 border-zinc-900 flex flex-col justify-between">
              <div>
                <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl max-w-fit mb-4 text-violet-400">
                  {f.icon}
                </div>
                <h3 className="font-extrabold text-white text-sm tracking-tight leading-tight">{f.title}</h3>
                <p className="text-zinc-400 text-[11px] mt-2.5 leading-relaxed font-light">{f.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 py-16 border-t border-zinc-900/60">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Simple Pricing Plans</h2>
          <p className="text-zinc-500 text-xs mt-1">Select the tier matching your dining capacity</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {/* Free Trial */}
          <Card className="bg-zinc-900/20 border-zinc-900 flex flex-col justify-between p-6">
            <div>
              <h3 className="font-bold text-white text-sm">Free Trial</h3>
              <p className="text-zinc-500 text-[10px] mt-0.5">Explore platform capabilities</p>
              <h2 className="text-2xl font-black text-white mt-4">$0</h2>
              <ul className="mt-4 flex flex-col gap-2 text-[10px] text-zinc-400">
                <li className="flex items-center gap-1.5">✓ Scans up to 5 Tables</li>
                <li className="flex items-center gap-1.5">✓ Standard menu editor</li>
                <li className="flex items-center gap-1.5">✓ Basic KDS routing</li>
              </ul>
            </div>
            <a href="#contact" className="w-full text-center mt-6 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-lg block">Sign Up Free</a>
          </Card>

          {/* Basic Restaurant */}
          <Card className="bg-zinc-900/20 border-violet-500/20 shadow-md shadow-violet-500/5 flex flex-col justify-between p-6 relative">
            <span className="absolute -top-3 right-6 bg-violet-600 text-white text-[8px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full">POPULAR</span>
            <div>
              <h3 className="font-bold text-white text-sm">Basic Dining</h3>
              <p className="text-zinc-500 text-[10px] mt-0.5">Perfect for cafes and bistros</p>
              <h2 className="text-2xl font-black text-white mt-4">$29<span className="text-xs text-zinc-500">/mo</span></h2>
              <ul className="mt-4 flex flex-col gap-2 text-[10px] text-zinc-400">
                <li className="flex items-center gap-1.5">✓ Scans up to 20 Tables</li>
                <li className="flex items-center gap-1.5">✓ Low-stock inventory alert</li>
                <li className="flex items-center gap-1.5">✓ Full recipes linking</li>
              </ul>
            </div>
            <a href="#contact" className="w-full text-center mt-6 py-2 bg-violet-600 hover:bg-violet-750 text-white text-xs font-bold rounded-lg block">Request Basic</a>
          </Card>

          {/* Pro Banquet */}
          <Card className="bg-zinc-900/20 border-zinc-900 flex flex-col justify-between p-6">
            <div>
              <h3 className="font-bold text-white text-sm">Pro Premium</h3>
              <p className="text-zinc-500 text-[10px] mt-0.5">For high-volume bistros</p>
              <h2 className="text-2xl font-black text-white mt-4">$59<span className="text-xs text-zinc-500">/mo</span></h2>
              <ul className="mt-4 flex flex-col gap-2 text-[10px] text-zinc-400">
                <li className="flex items-center gap-1.5">✓ Unlimited Tables & QR</li>
                <li className="flex items-center gap-1.5">✓ Priority 24/7 support</li>
                <li className="flex items-center gap-1.5">✓ Custom logo styling</li>
              </ul>
            </div>
            <a href="#contact" className="w-full text-center mt-6 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-lg block">Request Pro</a>
          </Card>
        </div>
      </section>

      {/* Lead Capture form */}
      <section id="contact" className="max-w-xl mx-auto px-6 py-16 border-t border-zinc-900/60">
        <Card className="bg-zinc-900/40 border-zinc-900 p-8 shadow-2xl">
          <div className="text-center pb-6 border-b border-zinc-900/60">
            <h2 className="text-xl font-bold text-white tracking-tight">Request Sandbox Access</h2>
            <p className="text-zinc-400 text-xs font-light mt-1">Submit your details to seed a demo account</p>
          </div>

          {success ? (
            <div className="mt-6 text-center flex flex-col items-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <h3 className="font-bold text-white text-sm mt-1">Inquiry Submitted Successfully!</h3>
              <p className="text-zinc-400 text-xs leading-relaxed font-light max-w-xs">
                We've captured your details. Seed accounts (owner/chef) can be signed-in to try table ordering now.
              </p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="mt-6 flex flex-col gap-4">
              <Input
                label="Full Name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
              <Input
                label="Restaurant Name"
                placeholder="Gourmet Garden Cafe"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                disabled={loading}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="john@gourmet.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <Input
                  label="Phone Number"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Message / Notes</label>
                <textarea
                  placeholder="Tell us about your restaurant capacity..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 transition-all focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}

              <Button type="submit" className="w-full mt-2 py-3 flex items-center justify-center gap-1.5" disabled={loading}>
                <Send className="w-3.5 h-3.5" /> {loading ? "Sending..." : "Submit Inquiry"}
              </Button>
            </form>
          )}
        </Card>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-zinc-900/60 text-center text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} Gourmet POS Platform. All rights reserved. Built as Phase 1 implementation.
      </footer>
    </div>
  );
}
