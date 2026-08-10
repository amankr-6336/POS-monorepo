import { Link } from "react-router-dom";
import { 
  Scan, 
  Smartphone, 
  Receipt, 
  ClipboardCheck, 
  Sliders, 
  Package, 
  TrendingUp 
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col bg-white">
      {/* 1. Hero Section */}
      <section className="relative bg-white py-16 lg:py-24 overflow-hidden border-b border-[#EDE8E0]/40">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Column: Text & Stats */}
          <div className="lg:col-span-6 flex flex-col items-start text-left z-10">
            {/* Orange/Tan Accent Bar */}
            <div className="w-10 h-1.5 bg-[#E5AA70] rounded-sm mb-8"></div>
            
            {/* Main Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold font-serif text-[#1C150E] tracking-tight leading-[1.1] mb-6">
              Run the Floor Without the Chaos
            </h1>
            
            {/* Subheading */}
            <p className="text-[#6E6050] text-[15px] md:text-[16px] leading-relaxed font-light max-w-xl mb-10">
              The tactile point-of-sale system built for high-volume hospitality. Experience the reliability of hard copy with the speed of digital.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-10">
              <Link 
                to="/contact" 
                className="px-8 py-3.5 text-[11px] font-bold tracking-[0.15em] bg-[#1C150E] hover:bg-zinc-800 text-white transition-all uppercase text-center flex items-center justify-center gap-2"
              >
                Get Started <span className="text-sm font-light">→</span>
              </Link>
              <Link 
                to="/pricing" 
                className="px-8 py-3.5 text-[11px] font-bold tracking-[0.15em] text-[#1C150E] hover:text-zinc-600 transition-colors uppercase text-center"
              >
                See Pricing
              </Link>
            </div>
            
            {/* Divider Line */}
            <div className="w-full border-t border-[#EDE8E0]/70 mb-8"></div>
            
            {/* Statistics Row */}
            <div className="grid grid-cols-2 gap-12">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-[0.15em] text-[#857766] uppercase">AVG TICKET TIME</span>
                <span className="text-3xl font-bold font-serif text-[#1C150E] mt-1.5 tracking-tight">12.5</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-[0.15em] text-[#857766] uppercase">SYSTEM UPTIME</span>
                <span className="text-3xl font-bold font-serif text-[#1C150E] mt-1.5 tracking-tight">99.9%</span>
              </div>
            </div>
          </div>

          {/* Right Column: Floating Tickets & Image Container */}
          <div className="lg:col-span-6 flex justify-center items-center z-10">
            {/* Warm Accent Background Block wrapper */}
            <div className="relative w-full max-w-[500px] aspect-[4/3] bg-[#FCF5EB] border border-[#EDE8E0] p-6 lg:p-8 flex items-center justify-center">
              
              {/* Main Kitchen Background Image */}
              <div className="relative w-full h-full overflow-hidden shadow-md">
                <img 
                  src="/chef_kitchen.png" 
                  alt="Chef cooking in kitchen" 
                  className="w-full h-full object-cover grayscale-[10%]"
                />
                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-black/10 mix-blend-multiply"></div>
              </div>

              {/* Monospace Kitchen Ticket 1 (Top Left) */}
              <div className="absolute -top-4 -left-6 md:-left-8 w-52 bg-white border border-[#EDE8E0] shadow-xl p-3.5 font-mono text-[9px] text-[#1C150E] rounded-sm flex flex-col gap-1.5">
                <div className="flex justify-between items-center border-b border-dashed border-[#EDE8E0] pb-1.5">
                  <span>TBL 42</span>
                  <span className="px-1.5 py-0.5 bg-red-150 text-red-650 font-bold text-[8px] uppercase tracking-wider rounded-sm animate-pulse">RUSH</span>
                </div>
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <span className="font-bold text-[11px]">Steak Frites</span>
                  <span className="text-[#6E6050] text-[8.5px] leading-tight">Mid Rare, No Mayo</span>
                </div>
              </div>

              {/* Monospace Kitchen Ticket 2 (Bottom Right) */}
              <div className="absolute -bottom-4 -right-6 md:-right-8 w-52 bg-white border border-[#EDE8E0] shadow-xl p-3.5 font-mono text-[9px] text-[#1C150E] rounded-sm flex flex-col gap-1.5">
                <div className="flex justify-between items-center border-b border-dashed border-[#EDE8E0] pb-1.5">
                  <span>TBL 12</span>
                  <span className="px-1.5 py-0.5 bg-[#5A6F62]/10 text-[#5A6F62] font-bold text-[8px] uppercase tracking-wider rounded-sm">PICK UP</span>
                </div>
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <span className="font-bold text-[11px]">2x Oysters</span>
                  <span className="text-[#6E6050] text-[8.5px] leading-tight">Mignonette, Lemon</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 2. The Line Flow Section */}
      <section id="line-flow" className="bg-[#FCF5EB] py-20 lg:py-28 border-b border-[#EDE8E0]/40">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Centered Headers */}
          <div className="text-center mb-16 lg:mb-24">
            <h2 className="text-3xl md:text-[38px] font-bold font-serif text-[#1C150E] mb-4">
              The Line Flow
            </h2>
            <p className="text-[#6E6050] text-sm md:text-base font-light max-w-xl mx-auto">
              Three simple steps to keep your floor moving and your kitchen firing.
            </p>
          </div>
          
          {/* Three Cards Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 lg:gap-8 relative">
            
            {/* Dotted Connection Line (Desktop) */}
            <div className="hidden md:block absolute top-[28%] left-[10%] right-[10%] border-t border-dashed border-[#DFD8CC] z-0"></div>
            
            {/* Card 1: Scan & Seat */}
            <div className="relative bg-white border border-[#EDE8E0] border-t-4 border-t-[#1C150E] p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow z-10 rounded-sm">
              {/* Step Circle Badge */}
              <div className="w-10 h-10 rounded-full border border-[#EDE8E0] bg-[#FCF5EB] flex items-center justify-center text-xs font-bold text-[#1C150E] -mt-13 mb-6">
                1
              </div>
              <Scan className="w-7 h-7 text-[#1C150E] stroke-[1.5] mb-5" />
              <h3 className="font-serif text-[17px] font-bold text-[#1C150E] mb-3">Scan & Seat</h3>
              <p className="text-[#6E6050] text-[12.5px] leading-relaxed font-light">
                Create physical tokens or QR codes. Tables are instantly logged on the floor plan.
              </p>
            </div>
            
            {/* Card 2: Fire Order */}
            <div className="relative bg-white border border-[#EDE8E0] border-t-4 border-t-[#E5AA70] p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow z-10 rounded-sm">
              {/* Step Circle Badge */}
              <div className="w-10 h-10 rounded-full border border-[#EDE8E0] bg-[#FCF5EB] flex items-center justify-center text-xs font-bold text-[#1C150E] -mt-13 mb-6">
                2
              </div>
              <Smartphone className="w-7 h-7 text-[#1C150E] stroke-[1.5] mb-5" />
              <h3 className="font-serif text-[17px] font-bold text-[#1C150E] mb-3">Fire Order</h3>
              <p className="text-[#6E6050] text-[12.5px] leading-relaxed font-light">
                Servers punch in orders on robust handhelds. Tickets print instantly to relevant stations.
              </p>
            </div>
            
            {/* Card 3: Served & Paid */}
            <div className="relative bg-white border border-[#EDE8E0] border-t-4 border-t-[#5A6F62] p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow z-10 rounded-sm">
              {/* Step Circle Badge */}
              <div className="w-10 h-10 rounded-full border border-[#EDE8E0] bg-[#FCF5EB] flex items-center justify-center text-xs font-bold text-[#1C150E] -mt-13 mb-6">
                3
              </div>
              <Receipt className="w-7 h-7 text-[#5A6F62] stroke-[1.5] mb-5" />
              <h3 className="font-serif text-[17px] font-bold text-[#5A6F62] mb-3">Served & Paid</h3>
              <p className="text-[#6E6050] text-[12.5px] leading-relaxed font-light">
                Runners deliver, guests tap to pay at the table. The loop closes automatically.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Industrial Grade Features Section */}
      <section className="bg-white py-20 lg:py-28 border-b border-[#EDE8E0]/40">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="flex flex-col text-left">
              <h2 className="text-3xl md:text-[38px] font-bold font-serif text-[#1C150E] mb-3">
                Industrial Grade Features
              </h2>
              <p className="text-[#6E6050] text-sm font-light">
                Tools designed for the noise, heat, and pace of real kitchens.
              </p>
            </div>
            <div className="text-left md:text-right font-mono text-[9px] tracking-widest text-[#857766] font-semibold border-l-2 md:border-l-0 md:border-r-2 border-[#E5AA70] pl-3 md:pl-0 md:pr-3 py-1">
              <span>SYSTEM V.2.4.1</span>
              <br />
              <span className="text-[#1C150E] font-bold">STABLE BUILD</span>
            </div>
          </div>
          
          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Left Column Cards */}
            <div className="flex flex-col gap-8">
              
              {/* Card A: Live Kitchen Tickets */}
              <div className="bg-[#FDF6EB] border border-[#EDE8E0] p-8 rounded-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-[#1C150E]">
                    <ClipboardCheck className="w-5 h-5" />
                    <h3 className="font-serif text-lg font-bold">Live Kitchen Tickets</h3>
                  </div>
                  <p className="text-[#6E6050] text-[12.5px] leading-relaxed font-light mb-8">
                    Digital displays that look and act like paper. Swipe to complete, tap to bump. Color-coded for rush, VIP, and allergies.
                  </p>
                </div>
                
                {/* Tickets Preview Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Ticket 1 */}
                  <div className="bg-white border border-[#EDE8E0] shadow-sm p-4 font-mono text-[9px] text-[#1C150E] flex flex-col gap-1.5 rounded-sm">
                    <div className="flex justify-between items-center border-b border-dashed border-[#EDE8E0] pb-1.5">
                      <span className="font-bold">T42</span>
                      <span className="text-red-600 font-bold">RUSH</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span>1x Ribeye</span>
                        <span className="text-[#857766]">Mid Rare</span>
                      </div>
                      <div className="flex justify-between">
                        <span>1x Scallops</span>
                        <span className="text-red-550 font-bold">*ALLERGY*</span>
                      </div>
                    </div>
                    <div className="border-t border-dashed border-[#EDE8E0] pt-1.5 flex justify-between text-[#857766] text-[8px]">
                      <span>04:32 ELAPSED</span>
                    </div>
                  </div>
                  {/* Ticket 2 */}
                  <div className="bg-white border border-[#EDE8E0] shadow-sm p-4 font-mono text-[9px] text-[#1C150E] flex flex-col gap-1.5 rounded-sm">
                    <div className="flex justify-between items-center border-b border-dashed border-[#EDE8E0] pb-1.5">
                      <span className="font-bold">Bar 4</span>
                      <span className="text-[#E5AA70] font-bold">COURSE 1</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span>2x Martini</span>
                        <span className="text-[#857766]">Dry, Olives</span>
                      </div>
                    </div>
                    <div className="border-t border-dashed border-[#EDE8E0] pt-1.5 flex justify-between text-[#857766] text-[8px]">
                      <span>02:11 ELAPSED</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Card C: Inventory */}
              <div className="bg-[#FDF6EB] border border-[#EDE8E0] p-8 rounded-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-[#1C150E]">
                    <Package className="w-5 h-5" />
                    <h3 className="font-serif text-lg font-bold">Inventory</h3>
                  </div>
                  <p className="text-[#6E6050] text-[12.5px] leading-relaxed font-light mb-8">
                    Track, waste, and count in real-time. Automated vendor POs when you run low.
                  </p>
                </div>
                
                {/* Progress bars block */}
                <div className="flex flex-col gap-4 font-mono text-[10px] text-[#1C150E]">
                  <div>
                    <div className="flex justify-between mb-1.5 font-bold">
                      <span>Prime Rib</span>
                      <span className="text-red-650">11%</span>
                    </div>
                    <div className="w-full bg-[#EDE8E0] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full w-[11%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5 font-bold">
                      <span>Dry Aged Ribeye</span>
                      <span>0%</span>
                    </div>
                    <div className="w-full bg-[#EDE8E0] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#1C150E] h-full w-[0%]"></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column Cards */}
            <div className="flex flex-col gap-8">
              
              {/* Card B: Menu Config */}
              <div className="bg-[#1C150E] text-white p-8 rounded-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-white">
                    <Sliders className="w-5 h-5 text-[#E5AA70]" />
                    <h3 className="font-serif text-lg font-bold text-white">Menu Config</h3>
                  </div>
                  <p className="text-[#918474] text-[12.5px] leading-relaxed font-light mb-8">
                    Mutate with a single tap across all terminals. Dynamic pricing for happy hours.
                  </p>
                </div>
                
                {/* Menu items block */}
                <div className="flex flex-col gap-3 font-mono text-[10px] text-zinc-300">
                  <div className="flex justify-between items-center border-b border-[#2E251B] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white">Oysters (12)</span>
                      <span className="px-1 py-0.2 bg-red-900/30 text-red-400 text-[8px] font-bold uppercase rounded-sm">50%</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="line-through text-[#6E6050]">$32</span>
                      <span className="text-[#E5AA70] font-bold">$16</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-b border-[#2E251B] pb-2">
                    <span className="text-white">Wagyu Ribeye</span>
                    <span className="font-bold text-white">$74</span>
                  </div>
                </div>
              </div>
              
              {/* Card D: End of Day Reporting */}
              <div className="bg-white border border-[#EDE8E0] p-8 rounded-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-[#1C150E]">
                    <TrendingUp className="w-5 h-5" />
                    <h3 className="font-serif text-lg font-bold">End of Day Reporting</h3>
                  </div>
                  <p className="text-[#6E6050] text-[12.5px] leading-relaxed font-light mb-8">
                    Z-reports that actually make sense. Labor costs vs sales mapped hour-by-hour.
                  </p>
                </div>
                
                {/* Chart SVG block */}
                <div className="w-full bg-white pt-4">
                  <svg className="w-full h-24 text-zinc-300" viewBox="0 0 400 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#918474" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#918474" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Fill Area Chart */}
                    <path 
                      d="M 0 100 C 50 95, 100 90, 150 70 C 200 45, 230 40, 280 42 C 330 45, 370 75, 400 100 Z" 
                      fill="url(#chart-grad)" 
                    />
                    {/* Stroke line */}
                    <path 
                      d="M 0 100 C 50 95, 100 90, 150 70 C 200 45, 230 40, 280 42 C 330 45, 370 75, 400 100" 
                      fill="none" 
                      stroke="#918474" 
                      strokeWidth="2.5" 
                    />
                  </svg>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 4. Deep Wine Red CTA Section */}
      <section className="bg-[#4C1C24] py-24 text-center relative overflow-hidden">
        {/* Subtle geometric lines */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03),transparent)]"></div>
        
        <div className="max-w-4xl mx-auto px-6 relative z-10 flex flex-col items-center">
          
          {/* Knife & Fork Icon in the center */}
          <div className="mb-8">
            <svg className="w-8 h-8 text-[#F8BBA8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2v10m-3-10v5c0 1.5 1.5 2 1.5 2s1.5-.5 1.5-2V2M15 15h6v7h-6z" />
              <path d="M4 2v13c0 2 2 3 4 3V2M8 18h2v4H8z" />
            </svg>
          </div>
          
          {/* Header */}
          <h2 className="text-3xl md:text-[42px] font-bold font-serif text-white tracking-tight leading-tight mb-4">
            Ready to clean up the line?
          </h2>
          
          {/* Subtitle */}
          <p className="text-[#F8BBA8] text-sm md:text-base font-light leading-relaxed max-w-xl mb-10 opacity-90">
            Join hundreds of high-volume restaurants running smoother shifts, cleaner turns, and happier staff.
          </p>
          
          {/* CTA Form and Links */}
          <div className="flex flex-col items-center gap-4 w-full">
            <Link 
              to="/contact" 
              className="px-10 py-4 text-[11px] font-bold tracking-[0.15em] bg-white hover:bg-[#FDFBF7] text-[#4C1C24] transition-all uppercase rounded-sm shadow-md"
            >
              Start a Free Trial
            </Link>
            <Link 
              to="/pricing" 
              className="text-[9.5px] font-semibold tracking-[0.15em] text-[#F8BBA8]/80 hover:text-white uppercase transition-colors"
            >
              No Hardware Purchase Required
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}
