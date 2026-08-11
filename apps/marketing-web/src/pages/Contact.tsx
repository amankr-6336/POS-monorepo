import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, CheckCircle2 } from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api/v1";

export default function Contact() {
  const [searchParams] = useSearchParams();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [issueType, setIssueType] = useState("Technical Support");
  const [details, setDetails] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill email and details if passed in query params
  useEffect(() => {
    const qEmail = searchParams.get("email");
    const qPlan = searchParams.get("plan");
    if (qEmail) setEmail(qEmail);
    if (qPlan) {
      setDetails(`Interested in signing up for the ${qPlan.toUpperCase()} pricing plan. Please guide me with sandbox access.`);
    }
  }, [searchParams]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !details) {
      setError("Please fill out all required fields.");
      return;
    }

    setLoading(true);
    try {
      // Map form fields to match database lead validation rules
      const payload = {
        name,
        restaurantName: "The Rail Customer",
        email,
        phone: "+1 (800) 555-0199",
        message: `[Issue Type: ${issueType}] ${details}${isUrgent ? ' (MARK AS URGENT)' : ''}`
      };

      const res = await fetch(`${API_BASE_URL}/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess(true);
        setName("");
        setEmail("");
        setDetails("");
        setIsUrgent(false);
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
    <div className="bg-[#FCF5EB] min-h-screen py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        
        {/* Left Column: SUPPORT Receipt Ticket */}
        <div className="lg:col-span-5 flex justify-center w-full">
          <div className="relative w-full max-w-sm bg-white border border-[#EDE8E0] shadow-xl p-8 font-mono text-[9px] text-[#1C150E] uppercase flex flex-col gap-6 rounded-sm">
            
            {/* Perforated Top edge */}
            <div className="w-full border-t-[3px] border-dashed border-[#1C150E]/20 mt-[-16px]"></div>

            {/* Push-pin hanger peg on right edge */}
            <div className="absolute right-0 top-[28%] translate-x-1/2 w-6 h-6 rounded-full bg-[#1C150E] border border-black flex items-center justify-center shadow-md z-10 cursor-pointer">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E5AA70]"></div>
            </div>

            {/* Receipt Header */}
            <div className="text-center flex flex-col items-center gap-1 mt-4">
              <h2 className="font-serif text-3xl font-black tracking-widest text-[#1C150E]">SUPPORT</h2>
              <span className="text-[#857766] tracking-[0.2em] font-semibold">TICKET# 9090</span>
              <span className="text-[#857766] text-[8px] tracking-wider mt-1">20:22:05 EST</span>
            </div>

            {/* Divider */}
            <div className="w-full border-t border-[#1C150E] my-1"></div>

            {/* Phone Line Section */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[#857766] font-bold tracking-wider">PHONE LINE</span>
              <span className="text-[11px] font-bold text-[#1C150E] tracking-wide">+1 (800) 555-0199</span>
            </div>

            {/* Kitchen Door Section */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[#857766] font-bold tracking-wider">KITCHEN DOOR</span>
              <div className="text-[11px] font-bold text-[#1C150E] tracking-wide flex flex-col leading-relaxed">
                <span>86 Prep Lane</span>
                <span>Suite B</span>
                <span>Chicago, IL 60607</span>
              </div>
            </div>

            {/* Service Hours Section */}
            <div className="flex flex-col gap-2">
              <span className="text-[#857766] font-bold tracking-wider">SERVICE HOURS</span>
              <div className="text-[11px] font-bold text-[#1C150E] tracking-wide flex flex-col gap-1">
                <div className="flex justify-between border-b border-[#EDE8E0]/40 pb-1">
                  <span>Mon - Fri</span>
                  <span>08:00 - 22:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Sat - Sun</span>
                  <span>10:00 - 23:00</span>
                </div>
              </div>
            </div>

            {/* QR Code and Bottom support text */}
            <div className="mt-8 text-center flex flex-col items-center gap-3">
              {/* Custom SVG QR Code outline */}
              <svg className="w-10 h-10 text-[#1C150E] opacity-95" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="6" height="6" strokeWidth="2" />
                <rect x="16" y="2" width="6" height="6" strokeWidth="2" />
                <rect x="2" y="16" width="6" height="6" strokeWidth="2" />
                <rect x="9" y="9" width="6" height="6" strokeWidth="1.5" />
                <path d="M16 16h2v2h-2zm4 4h2v2h-2zm-4 4h2v-2h-2zm4-4h2v-2h-2z" fill="currentColor" />
              </svg>
              <span className="text-[7.5px] font-bold tracking-[0.2em] text-[#857766]">SCAN FOR URGENT SUPPORT</span>
            </div>

            {/* Jagged Bottom edge perforation */}
            <div className="absolute bottom-0 left-0 right-0 h-3 overflow-hidden translate-y-3">
              <svg className="w-full h-full text-white fill-current" viewBox="0 0 100 10" preserveAspectRatio="none">
                <polygon points="0,0 2.5,5 5,0 7.5,5 10,0 12.5,5 15,0 17.5,5 20,0 22.5,5 25,0 27.5,5 30,0 32.5,5 35,0 37.5,5 40,0 42.5,5 45,0 47.5,5 50,0 52.5,5 55,0 57.5,5 60,0 62.5,5 65,0 67.5,5 70,0 72.5,5 75,0 77.5,5 80,0 82.5,5 85,0 87.5,5 90,0 92.5,5 95,0 97.5,5 100,0 100,10 0,10" />
              </svg>
            </div>

          </div>
        </div>

        {/* Right Column: Contact Form */}
        <div className="lg:col-span-7 flex flex-col text-left">
          
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-4 text-[#1C150E]">
            <Bell className="w-6 h-6 text-[#E5AA70] fill-current" />
            <h1 className="font-serif text-2xl lg:text-[28px] font-black uppercase tracking-wide">
              RING THE COUNTER
            </h1>
          </div>
          
          <p className="text-[#6E6050] text-[13px] font-light leading-relaxed mb-10 max-w-xl">
            Need a hand with setup, or ran into a bug on the line? Drop us a ticket. We prioritize getting you back to service.
          </p>

          {success ? (
            <div className="bg-white border border-[#EDE8E0] p-8 rounded-sm shadow-sm flex flex-col items-center text-center gap-4 max-w-md">
              <CheckCircle2 className="w-12 h-12 text-[#5A6F62]" />
              <h3 className="font-serif text-lg font-bold text-[#1C150E]">Ticket Fired!</h3>
              <p className="text-[#6E6050] text-xs leading-relaxed font-light">
                Your support chit has been printed in the kitchen. We will ring you back shortly to assist.
              </p>
              <button 
                onClick={() => setSuccess(false)}
                className="mt-4 text-[10px] font-bold tracking-[0.2em] uppercase text-[#1C150E] hover:text-[#E5AA70]"
              >
                File Another Ticket
              </button>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="flex flex-col gap-8 w-full max-w-2xl">
              
              {/* Name & Email inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* NAME */}
                <div className="flex flex-col">
                  <label className="text-[10px] tracking-[0.2em] font-bold text-[#857766] uppercase mb-1">
                    NAME
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chef Marco"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className="w-full bg-transparent border-b border-[#1C150E] text-[#1C150E] placeholder-[#857766]/40 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#E5AA70] transition-colors rounded-none"
                    required
                  />
                </div>
                
                {/* EMAIL */}
                <div className="flex flex-col">
                  <label className="text-[10px] tracking-[0.2em] font-bold text-[#857766] uppercase mb-1">
                    EMAIL
                  </label>
                  <input
                    type="email"
                    placeholder="expo@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full bg-transparent border-b border-[#1C150E] text-[#1C150E] placeholder-[#857766]/40 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#E5AA70] transition-colors rounded-none"
                    required
                  />
                </div>

              </div>

              {/* ISSUE TYPE dropdown select */}
              <div className="flex flex-col relative">
                <label className="text-[10px] tracking-[0.2em] font-bold text-[#857766] uppercase mb-1">
                  ISSUE TYPE
                </label>
                <div className="relative w-full">
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    disabled={loading}
                    className="w-full bg-transparent border-b border-[#1C150E] text-[#1C150E] py-2.5 text-xs font-semibold focus:outline-none focus:border-[#E5AA70] transition-colors rounded-none appearance-none cursor-pointer pr-10"
                  >
                    <option value="Technical Support">Technical Support</option>
                    <option value="Billing & Account">Billing & Account</option>
                    <option value="General Inquiry">General Inquiry</option>
                  </select>
                  {/* Custom Arrow */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none pr-1">
                    <svg className="w-3.5 h-3.5 text-[#1C150E]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* DETAILS textarea */}
              <div className="flex flex-col">
                <label className="text-[10px] tracking-[0.2em] font-bold text-[#857766] uppercase mb-1">
                  DETAILS
                </label>
                <textarea
                  placeholder="Describe what went wrong on the line..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  disabled={loading}
                  rows={4}
                  className="w-full border border-[#1C150E] bg-transparent text-[#1C150E] placeholder-[#857766]/40 p-4 h-32 text-xs font-semibold focus:outline-none focus:border-[#E5AA70] transition-colors resize-none rounded-none"
                  required
                />
              </div>

              {/* MARK AS URGENT checkbox */}
              <div className="flex items-center">
                <div 
                  onClick={() => !loading && setIsUrgent(!isUrgent)}
                  className="flex items-center gap-3.5 cursor-pointer select-none"
                >
                  <div className="w-5 h-5 border border-[#1C150E] bg-transparent flex items-center justify-center text-[#1C150E] relative transition-colors font-sans">
                    {isUrgent && <span className="font-black text-xs">✓</span>}
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#1C150E] uppercase">
                    MARK AS URGENT
                  </span>
                </div>
              </div>

              {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

              {/* 3D-shadow Button */}
              <div className="mt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3.5 bg-[#E5AA70] text-[#1C150E] border border-[#1C150E] font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#1C150E] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all active:scale-[0.97]"
                >
                  {loading ? (
                    "FIRING..."
                  ) : (
                    <>
                      <span className="text-[11px]">▷</span> FIRE TICKET
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
}
