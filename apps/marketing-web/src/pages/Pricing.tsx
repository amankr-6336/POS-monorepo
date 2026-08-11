import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Check, 
  ChevronDown 
} from "lucide-react";

export default function Pricing() {
  const [faqOpen1, setFaqOpen1] = useState(false);
  const [faqOpen2, setFaqOpen2] = useState(false);

  return (
    <div className="flex flex-col bg-white">
      {/* 1. Hero Section (White background) */}
      <section className="bg-white py-16 lg:py-24 text-center border-b border-[#EDE8E0]/40">
        <div className="max-w-3xl mx-auto px-6 flex flex-col items-center">
          {/* Underlined Pricing Protocol Label */}
          <div className="flex flex-col items-center mb-4">
            <span className="text-[9px] tracking-[0.25em] font-bold text-[#857766] uppercase">PRICING PROTOCOL</span>
            <div className="w-12 h-[1px] bg-[#EDE8E0] mt-1.5"></div>
          </div>
          
          {/* Main Title with small dollar suffix */}
          <h1 className="text-4xl md:text-5xl lg:text-[44px] font-bold font-serif text-[#1C150E] tracking-tight leading-[1.1] inline-flex items-center gap-1.5">
            Commit to the Line.
            <span className="text-xl md:text-2xl text-[#857766]/50 font-sans font-light mt-1">$</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-[#6E6050] text-[13px] md:text-[14px] leading-relaxed font-light max-w-xl mt-5">
            Hardcopy pricing for high-pressure environments. No hidden fees. Just equipment that works as hard as your staff.
          </p>
        </div>
      </section>

      {/* 2. Pricing Tiers Section (White background) */}
      <section className="bg-white py-16 border-b border-[#EDE8E0]/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
            {/* Card 1: BOH Basic */}
            <div className="border border-[#EDE8E0]/80 bg-white rounded-sm p-8 shadow-sm flex flex-col justify-between relative hover:shadow-md transition-shadow">
              {/* Tier badge */}
              <span className="absolute top-6 right-6 border border-[#EDE8E0] px-2 py-0.5 text-[8px] font-mono tracking-widest text-[#857766] rounded-sm uppercase">
                TIER 1
              </span>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1C150E] mb-2">BOH Basic</h3>
                <p className="text-[#6E6050] text-[12px] font-light leading-relaxed mb-6 max-w-[200px]">
                  For small operations finding their rhythm.
                </p>
                <div className="flex items-baseline gap-1 mt-6">
                  <span className="text-4xl font-bold font-serif text-[#1C150E]">$49</span>
                  <span className="text-[10px] font-sans font-light text-[#857766]">/ mo per location</span>
                </div>
                
                {/* List */}
                <ul className="mt-8 flex flex-col gap-4 text-xs text-[#6E6050] font-light border-t border-[#EDE8E0]/70 pt-6">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#5A6F62] stroke-[3]" />
                    <span>Up to 3 terminals</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#5A6F62] stroke-[3]" />
                    <span>Standard KDS routing</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#5A6F62] stroke-[3]" />
                    <span>End-of-day reporting</span>
                  </li>
                  <li className="flex items-center gap-2.5 opacity-40">
                    <span className="text-[#857766] font-mono text-[10px] w-3.5 text-center">✕</span>
                    <span className="line-through">Multi-location sync</span>
                  </li>
                </ul>
              </div>
              
              <Link 
                to="/contact?plan=basic" 
                className="w-full text-center mt-10 text-[10px] font-bold tracking-[0.2em] text-[#1C150E] hover:text-[#E5AA70] uppercase transition-colors"
              >
                PUNCH IN
              </Link>
            </div>

            {/* Card 2: FOH Pro (Featured Card) */}
            <div className="border-2 border-[#E5AA70] bg-white rounded-sm p-8 shadow-md flex flex-col justify-between relative hover:shadow-lg transition-shadow">
              
              {/* Tilted double-border vintage-stamp */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 -rotate-[6deg] border-[3px] border-double border-[#D96B43] text-[#D96B43] bg-white px-3 py-0.5 text-[9px] font-bold tracking-[0.2em] uppercase z-10 shadow-sm select-none">
                MOST POPULAR
              </div>
              
              {/* Tier badge */}
              <span className="absolute top-6 right-6 border border-[#EDE8E0] px-2 py-0.5 text-[8px] font-mono tracking-widest text-[#857766] rounded-sm uppercase">
                TIER 2
              </span>
              
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1C150E] mb-2">FOH Pro</h3>
                <p className="text-[#6E6050] text-[12px] font-light leading-relaxed mb-6 max-w-[200px]">
                  For high-volume houses requiring absolute control.
                </p>
                <div className="flex items-baseline gap-1 mt-6">
                  <span className="text-4xl font-bold font-serif text-[#1C150E]">$129</span>
                  <span className="text-[10px] font-sans font-light text-[#857766]">/ mo per location</span>
                </div>
                
                {/* List */}
                <ul className="mt-8 flex flex-col gap-4 text-xs text-[#6E6050] font-light border-t border-[#EDE8E0]/70 pt-6">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#5A6F62] stroke-[3]" />
                    <span>Unlimited terminals</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#5A6F62] stroke-[3]" />
                    <span>Advanced KDS & Expeditor views</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#5A6F62] stroke-[3]" />
                    <span>Real-time inventory sync</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#5A6F62] stroke-[3]" />
                    <span>Multi-location dashboard</span>
                  </li>
                </ul>
              </div>
              
              <Link 
                to="/contact?plan=pro" 
                className="w-full text-center mt-10 py-3.5 bg-[#E5AA70] hover:bg-[#E09F67] text-[#1C150E] text-[10px] font-bold tracking-[0.2em] uppercase rounded-sm block transition-colors shadow-sm"
              >
                FIRE ORDER
              </Link>
            </div>

            {/* Card 3: Enterprise */}
            <div className="border border-[#EDE8E0]/80 bg-white rounded-sm p-8 shadow-sm flex flex-col justify-between relative hover:shadow-md transition-shadow">
              {/* Tier badge */}
              <span className="absolute top-6 right-6 border border-[#EDE8E0] px-2 py-0.5 text-[8px] font-mono tracking-widest text-[#857766] rounded-sm uppercase">
                TIER 3
              </span>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1C150E] mb-2">Enterprise</h3>
                <p className="text-[#6E6050] text-[12px] font-light leading-relaxed mb-6 max-w-[200px]">
                  Custom deployments for multi-unit groups.
                </p>
                <div className="flex items-baseline gap-1 mt-6">
                  <span className="text-3xl font-bold font-serif text-[#1C150E]">Custom</span>
                </div>
                
                {/* List */}
                <ul className="mt-8 flex flex-col gap-4 text-xs text-[#6E6050] font-light border-t border-[#EDE8E0]/70 pt-6">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#5A6F62] stroke-[3]" />
                    <span>Everything in FOH Pro</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#5A6F62] stroke-[3]" />
                    <span>Dedicated Account Manager</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#5A6F62] stroke-[3]" />
                    <span>Custom API integrations</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#5A6F62] stroke-[3]" />
                    <span>On-site installation</span>
                  </li>
                </ul>
              </div>
              
              <Link 
                to="/contact?plan=enterprise" 
                className="w-full text-center mt-10 text-[10px] font-bold tracking-[0.2em] text-[#1C150E] hover:text-[#E5AA70] uppercase transition-colors"
              >
                CALL US
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Feature Matrix Hanging Section (White background) */}
      <section className="bg-white py-20 lg:py-28 border-b border-[#EDE8E0]/40">
        <div className="max-w-5xl mx-auto px-6">
          
          {/* Hanger Bar Peg rack */}
          <div className="flex items-center justify-between w-full h-[1.5px] bg-[#1C150E] relative px-10">
            {/* Left Peg */}
            <div className="absolute left-6 w-4 h-4 rounded-full border border-[#1C150E] bg-[#FCF5EB] flex items-center justify-center -translate-y-1/2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1C150E]"></div>
            </div>
            {/* Right Peg */}
            <div className="absolute right-6 w-4 h-4 rounded-full border border-[#1C150E] bg-[#FCF5EB] flex items-center justify-center -translate-y-1/2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1C150E]"></div>
            </div>
          </div>
          
          {/* Matrix Hanger Container */}
          <div className="border-2 border-[#1C150E] bg-white rounded-sm mt-3 p-8 shadow-md">
            <h2 className="font-serif text-2xl font-bold text-[#1C150E] mb-8 text-left">
              Feature Matrix
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1C150E] text-[#857766] font-mono text-[9px] font-bold uppercase tracking-wider">
                    <th className="py-4 pr-4 w-[40%]">CAPABILITY</th>
                    <th className="py-4 px-4 text-center w-[20%]">BASIC</th>
                    {/* Highlighted Column Header */}
                    <th className="py-4 px-4 text-center w-[20%] bg-[#FCF5EB] border-x border-[#EDE8E0] text-[#1C150E]">PRO</th>
                    <th className="py-4 pl-4 text-center w-[20%]">ENTERPRISE</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1 */}
                  <tr className="border-b border-[#EDE8E0]/45">
                    <td className="py-4 pr-4 text-[#1C150E] font-medium font-serif">Order Routing</td>
                    <td className="py-4 px-4 text-center text-[#6E6050] font-light">Standard</td>
                    <td className="py-4 px-4 text-center text-[#1C150E] font-bold bg-[#FCF5EB] border-x border-[#EDE8E0]">Advanced</td>
                    <td className="py-4 pl-4 text-center text-[#6E6050] font-light">Custom</td>
                  </tr>
                  
                  {/* Row 2 */}
                  <tr className="border-b border-[#EDE8E0]/45">
                    <td className="py-4 pr-4 text-[#1C150E] font-medium font-serif">Offline Mode</td>
                    <td className="py-4 px-4 text-center">
                      <Check className="w-4 h-4 text-[#5A6F62] stroke-[3] mx-auto" />
                    </td>
                    <td className="py-4 px-4 text-center bg-[#FCF5EB] border-x border-[#EDE8E0]">
                      <Check className="w-4 h-4 text-[#5A6F62] stroke-[3] mx-auto" />
                    </td>
                    <td className="py-4 pl-4 text-center">
                      <Check className="w-4 h-4 text-[#5A6F62] stroke-[3] mx-auto" />
                    </td>
                  </tr>

                  {/* Row 3 */}
                  <tr className="border-b border-transparent">
                    <td className="py-4 pr-4 text-[#1C150E] font-medium font-serif">Third-party Delivery Sync</td>
                    <td className="py-4 px-4 text-center text-[#857766] font-light">—</td>
                    <td className="py-4 px-4 text-center bg-[#FCF5EB] border-x border-[#EDE8E0]">
                      <Check className="w-4 h-4 text-[#5A6F62] stroke-[3] mx-auto" />
                    </td>
                    <td className="py-4 pl-4 text-center">
                      <Check className="w-4 h-4 text-[#5A6F62] stroke-[3] mx-auto" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </div>
      </section>

      {/* 4. Accordion FAQ Section (Warm cream background) */}
      <section className="bg-[#FCF5EB] py-20 border-b border-[#EDE8E0]/40">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col gap-6">
            
            {/* FAQ Item 1 */}
            <div className="border-b border-[#EDE8E0] pb-6">
              <button 
                onClick={() => setFaqOpen1(!faqOpen1)}
                className="w-full flex items-center justify-between text-left font-serif text-[17px] font-bold text-[#1C150E] py-2"
              >
                <span>Do I need specific hardware?</span>
                <ChevronDown className={`w-5 h-5 text-[#857766] transition-transform duration-300 ${faqOpen1 ? "rotate-180" : ""}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ${faqOpen1 ? "max-h-40 mt-3" : "max-h-0"}`}>
                <p className="text-[#6E6050] text-[13px] leading-relaxed font-light">
                  The Rail runs on standard iPads or robust Android handhelds. We can also provide heavy-duty terminal hardware optimized for kitchen environments.
                </p>
              </div>
            </div>

            {/* FAQ Item 2 */}
            <div className="border-b border-transparent pb-2">
              <button 
                onClick={() => setFaqOpen2(!faqOpen2)}
                className="w-full flex items-center justify-between text-left font-serif text-[17px] font-bold text-[#1C150E] py-2"
              >
                <span>What happens if the internet goes down?</span>
                <ChevronDown className={`w-5 h-5 text-[#857766] transition-transform duration-300 ${faqOpen2 ? "rotate-180" : ""}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ${faqOpen2 ? "max-h-40 mt-3" : "max-h-0"}`}>
                <p className="text-[#6E6050] text-[13px] leading-relaxed font-light">
                  Our local sync network continues to fire orders to the kitchen and print tickets even without internet. Payments are safely queued and processed once connectivity returns.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
