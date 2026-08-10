import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, Input, Card } from "@pos/ui";
import { CheckCircle2, Send } from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api/v1";

export default function Contact() {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill email and plan notes if passed in search query params
  useEffect(() => {
    const qEmail = searchParams.get("email");
    const qPlan = searchParams.get("plan");
    if (qEmail) setEmail(qEmail);
    if (qPlan) {
      setMessage(`Interested in signing up for the ${qPlan.toUpperCase()} pricing plan. Please guide me with sandbox access.`);
    }
  }, [searchParams]);

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

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-left w-full">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black font-serif text-zinc-100 tracking-tight leading-none">
          Get in Touch
        </h1>
        <p className="text-zinc-450 text-sm md:text-base mt-6 max-w-2xl leading-relaxed font-light">
          Have questions about transitioning to The Printed Plate? We're here to help.
        </p>
      </section>

      {/* Two-Column Contact Layout */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-zinc-800/40 grid grid-cols-1 lg:grid-cols-12 gap-12 w-full mb-10">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-7">
          <Card className="bg-zinc-900/20 border border-zinc-800 p-8 rounded-2xl relative shadow-lg">
            {success ? (
              <div className="text-center flex flex-col items-center gap-4 py-8">
                <CheckCircle2 className="w-14 h-14 text-[#5A6F62]" />
                <h3 className="font-bold font-serif text-zinc-100 text-base mt-2">Message Sent Successfully!</h3>
                <p className="text-zinc-450 text-xs leading-relaxed font-light max-w-sm">
                  Thank you for reaching out. We will get back to you shortly to provide platform sandbox access codes.
                </p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="flex flex-col gap-5">
                <Input
                  label="Full Name"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e: any) => setName(e.target.value)}
                  disabled={loading}
                />
                
                <Input
                  label="Establishment Name"
                  placeholder="The Daily Grind"
                  value={restaurantName}
                  onChange={(e: any) => setRestaurantName(e.target.value)}
                  disabled={loading}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e: any) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                  <Input
                    label="Phone Number"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e: any) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Message</label>
                  <textarea
                    placeholder="Tell us about your establishment..."
                    value={message}
                    onChange={(e: any) => setMessage(e.target.value)}
                    disabled={loading}
                    rows={4}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-850 rounded-xl text-zinc-150 placeholder-zinc-500 transition-all focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm resize-none"
                  />
                </div>

                {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}

                <Button type="submit" className="w-full mt-2 py-3.5 flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold shadow-md" disabled={loading}>
                  <Send className="w-3.5 h-3.5" /> {loading ? "Sending..." : "Send Message"}
                </Button>
              </form>
            )}
          </Card>
        </div>

        {/* Right Column: Info Details */}
        <div className="lg:col-span-5 flex flex-col gap-10 lg:pl-6">
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-serif text-zinc-100">Our Office</h2>
            <p className="text-zinc-450 text-sm font-light">Stop by or send us a letter.</p>
            <div className="text-zinc-300 text-xs font-light leading-relaxed mt-1 flex flex-col">
              <span>123 Letterpress Lane</span>
              <span>Suite 400</span>
              <span>San Francisco, CA 94103</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-serif text-zinc-100">Direct Contact</h2>
            <div className="text-zinc-300 text-xs font-light leading-relaxed mt-1 flex flex-col gap-1">
              <span>Email: <a href="mailto:hello@theprintedplate.com" className="text-violet-600 hover:underline">hello@theprintedplate.com</a></span>
              <span>Phone: <a href="tel:5551234567" className="text-violet-600 hover:underline">(555) 123-4567</a></span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
