import { Link } from "react-router-dom";
import { 
  UtensilsCrossed, 
  Mail,
  Power
} from "lucide-react";

export default function About() {
  return (
    <div className="flex flex-col bg-white">
      {/* 1. Hero Section (White background) */}
      <section className="bg-white py-16 lg:py-24 overflow-hidden border-b border-[#EDE8E0]/40">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Column: Text */}
          <div className="lg:col-span-6 flex flex-col items-start text-left z-10">
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold font-serif text-[#1C150E] tracking-tight leading-[1.1] mb-6">
              Service, smoothed.
            </h1>
            <p className="text-[#6E6050] text-[15px] md:text-[16px] leading-relaxed font-light max-w-xl">
              We believe the tools you use in the kitchen should be as reliable and focused as the people using them. The Rail is built to organize chaos, not add to it.
            </p>
          </div>

          {/* Right Column: Cooking Range Image and Ticket Overlay */}
          <div className="lg:col-span-6 flex justify-center items-center z-10">
            <div className="relative w-full max-w-[500px] aspect-[4/3] bg-[#FCF5EB] border border-[#EDE8E0] p-6 lg:p-8 flex items-center justify-center">
              
              {/* Cooking Range Image */}
              <div className="relative w-full h-full overflow-hidden shadow-md">
                <img 
                  src="/about_kitchen.png" 
                  alt="Kitchen cooking range" 
                  className="w-full h-full object-cover grayscale-[10%]"
                />
                <div className="absolute inset-0 bg-black/10 mix-blend-multiply"></div>
              </div>

              {/* Thermal Ticket Overlay (Center-Right Floating) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 bg-white border border-[#EDE8E0] shadow-2xl p-4 font-mono text-[9px] text-[#1C150E] rounded-sm flex flex-col gap-2.5">
                <div className="flex justify-between items-center border-b border-dashed border-[#EDE8E0] pb-2">
                  <span>TICKET 124</span>
                  <button className="text-[#6E6050] hover:text-[#1C150E] text-[11px] font-bold leading-none">✕</button>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-serif text-[15px] font-bold leading-tight">Kill the Noise.</span>
                  <span className="text-[#6E6050] text-[9.5px] leading-relaxed font-sans normal-case">
                    Build tools that respect the physical reality of the line.
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 2. The Anatomy of a Service Section (Cream background) */}
      <section className="bg-[#FCF5EB] py-20 lg:py-28 border-b border-[#EDE8E0]/40">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Section Header */}
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-[38px] font-bold font-serif text-[#1C150E] mb-4">
              The Anatomy of a Service
            </h2>
          </div>

          {/* Timeline Layout */}
          <div className="relative max-w-4xl mx-auto">
            
            {/* Center Vertical Axis Line */}
            <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[1.5px] bg-[#DFD8CC]"></div>

            {/* Timeline Steps */}
            <div className="flex flex-col gap-16 md:gap-24 relative">
              
              {/* Step 1: Mise en Place (Right Card, Left Timestamp) */}
              <div className="flex flex-col md:flex-row items-center justify-between w-full relative">
                {/* Left Side: Timestamp details */}
                <div className="w-full md:w-[42%] text-center md:text-right mb-4 md:mb-0">
                  <div className="font-mono text-xs text-[#857766] uppercase tracking-wider font-bold">16:00</div>
                  <div className="text-xs text-[#6E6050] mt-1 font-light max-w-xs md:ml-auto leading-relaxed">
                    Prep starts. The line is set. Quiet before the storm.
                  </div>
                </div>

                {/* Center Node Bullet */}
                <div className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-[#DFD8CC] bg-[#FCF5EB] z-10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E5AA70]"></div>
                </div>

                {/* Right Side: Card */}
                <div className="w-full md:w-[42%] bg-white border border-[#EDE8E0] border-t-[3px] border-t-[#EDE8E0] p-6 shadow-sm rounded-sm text-left">
                  <div className="flex justify-between items-center font-mono text-[9px] text-[#857766] mb-3 pb-1 border-b border-dashed border-[#EDE8E0]">
                    <span className="font-bold">THE SETUP</span>
                    <span>16:00</span>
                  </div>
                  <h3 className="font-serif text-[16px] font-bold text-[#1C150E] mb-2">Mise en Place</h3>
                  <p className="text-[#6E6050] text-[12px] leading-relaxed font-light">
                    Everything in its right place. Our software starts here—designed to map perfectly to your station layout, ensuring zero friction when the rush hits.
                  </p>
                </div>
              </div>

              {/* Step 2: The Chits Start Flying (Left Card, Right Timestamp) */}
              <div className="flex flex-col md:flex-row-reverse items-center justify-between w-full relative">
                {/* Right Side: Timestamp details */}
                <div className="w-full md:w-[42%] text-center md:text-left mb-4 md:mb-0">
                  <div className="font-mono text-xs text-[#857766] uppercase tracking-wider font-bold">19:45</div>
                  <div className="text-xs text-[#6E6050] mt-1 font-light max-w-xs leading-relaxed">
                    Pan meets fire. Tickets start entering.
                  </div>
                </div>

                {/* Center Node Bullet */}
                <div className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-[#DFD8CC] bg-[#FCF5EB] z-10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1C150E]"></div>
                </div>

                {/* Left Side: Card */}
                <div className="w-full md:w-[42%] bg-white border border-[#EDE8E0] border-t-[3px] border-t-[#E5AA70] p-6 shadow-sm rounded-sm text-left">
                  <div className="flex justify-between items-center font-mono text-[9px] text-[#857766] mb-3 pb-1 border-b border-dashed border-[#EDE8E0]">
                    <span className="font-bold text-[#1C150E]">THE RUSH</span>
                    <span className="text-red-650 font-bold">TKT 07</span>
                  </div>
                  <h3 className="font-serif text-[16px] font-bold text-[#1C150E] mb-2">The Chits Start Flying</h3>
                  <p className="text-[#6E6050] text-[12px] leading-relaxed font-light">
                    When the volume spikes, screens blur. We use stark contrast, huge typography, and fixed grids to make order details readable at a glance, from 5 feet away.
                  </p>
                </div>
              </div>

              {/* Step 3: Synchronized Fire (Right Card, Left Timestamp) */}
              <div className="flex flex-col md:flex-row items-center justify-between w-full relative">
                {/* Left Side: Timestamp details */}
                <div className="w-full md:w-[42%] text-center md:text-right mb-4 md:mb-0">
                  <div className="font-mono text-xs text-[#857766] uppercase tracking-wider font-bold">21:15</div>
                  <div className="text-xs text-[#6E6050] mt-1 font-light max-w-xs md:ml-auto leading-relaxed">
                    The peak. Firing on all cylinders.
                  </div>
                </div>

                {/* Center Node Bullet */}
                <div className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-[#DFD8CC] bg-[#FCF5EB] z-10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5A6F62]"></div>
                </div>

                {/* Right Side: Card */}
                <div className="w-full md:w-[42%] bg-white border border-[#EDE8E0] border-t-[3px] border-t-[#5A6F62] p-6 shadow-sm rounded-sm text-left">
                  <div className="flex justify-between items-center font-mono text-[9px] text-[#857766] mb-3 pb-1 border-b border-dashed border-[#EDE8E0]">
                    <span className="font-bold">THE SWEEP</span>
                    <span>TKT 83</span>
                  </div>
                  <h3 className="font-serif text-[16px] font-bold text-[#1C150E] mb-2">Synchronized Fire</h3>
                  <p className="text-[#6E6050] text-[12px] leading-relaxed font-light">
                    Coordination is survival. Out-station groups, spares, and alignments so expedited line cooks stay perfectly synced without shouting.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 3. Built on a foundation of analogue principles Section (White background) */}
      <section className="bg-white py-20 lg:py-28 border-b border-[#EDE8E0]/40">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Title */}
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-3xl md:text-[38px] font-bold font-serif text-[#1C150E] max-w-xl mx-auto leading-tight">
              Built on a foundation of analogue principles.
            </h2>
          </div>

          {/* Staggered Grid (Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 lg:gap-8 md:pb-12 max-w-6xl mx-auto">
            
            {/* Card 1: Real Kitchens (Left Column, Top aligned) */}
            <div className="relative bg-[#FCF5EB] border border-[#EDE8E0]/60 p-8 rounded-sm shadow-sm flex flex-col items-start text-left">
              {/* White Pin/Tape Decoration */}
              <div className="absolute top-0 right-8 -translate-y-1/2 w-3.5 h-6 bg-white border border-[#EDE8E0]/80 shadow-sm rounded-sm"></div>
              
              {/* Dark Square Icon */}
              <div className="w-10 h-10 bg-[#1C150E] flex items-center justify-center mb-6 rounded-sm text-white">
                <UtensilsCrossed className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#1C150E] mb-3">Real Kitchens</h3>
              <p className="text-[#6E6050] text-[12.5px] leading-relaxed font-light">
                We spent months on the line before writing a line of code. It feels like paper because paper works.
              </p>
            </div>

            {/* Card 2: Honest & Simple (Center Column, Shifted Lower in Desktop) */}
            <div className="relative bg-[#FCF5EB] border border-[#EDE8E0]/60 p-8 rounded-sm shadow-sm flex flex-col items-start text-left md:translate-y-12">
              {/* White Pin/Tape Decoration */}
              <div className="absolute top-0 right-8 -translate-y-1/2 w-3.5 h-6 bg-white border border-[#EDE8E0]/80 shadow-sm rounded-sm"></div>
              
              {/* Dark Square Icon */}
              <div className="w-10 h-10 bg-[#1C150E] flex items-center justify-center mb-6 rounded-sm text-white">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#1C150E] mb-3">Honest & Simple</h3>
              <p className="text-[#6E6050] text-[12.5px] leading-relaxed font-light">
                No loadouts or flashy animations that slow you down. Just the data you need to push the next plate.
              </p>
            </div>

            {/* Card 3: Fast Under Pressure (Right Column, Top aligned) */}
            <div className="relative bg-[#FCF5EB] border border-[#EDE8E0]/60 p-8 rounded-sm shadow-sm flex flex-col items-start text-left">
              {/* White Pin/Tape Decoration */}
              <div className="absolute top-0 right-8 -translate-y-1/2 w-3.5 h-6 bg-white border border-[#EDE8E0]/80 shadow-sm rounded-sm"></div>
              
              {/* Dark Square Icon */}
              <div className="w-10 h-10 bg-[#1C150E] flex items-center justify-center mb-6 rounded-sm text-white">
                <Power className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#1C150E] mb-3">Fast Under Pressure</h3>
              <p className="text-[#6E6050] text-[12.5px] leading-relaxed font-light">
                High-contrast, large tap targets, and instantly recognizable states. No hunting for buttons during a rush.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. Deep Dark CTA Section */}
      <section className="bg-[#110B06] py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02),transparent)]"></div>
        <div className="max-w-4xl mx-auto px-6 relative z-10 flex flex-col items-center">
          
          {/* Header */}
          <h2 className="text-3xl md:text-[42px] font-bold font-serif text-white tracking-tight leading-tight mb-4">
            Ready to rack up?
          </h2>
          
          {/* Subtitle */}
          <p className="text-[#918474] text-sm md:text-base font-light leading-relaxed max-w-xl mb-10">
            Stop fighting your POS. See how a tactile interface can speed up your service and reduce errors.
          </p>
          
          {/* Button */}
          <Link 
            to="/contact" 
            className="px-10 py-4 text-[11px] font-bold tracking-[0.15em] bg-[#FCF5EB] hover:bg-[#FDFBF7] text-[#1C150E] transition-all uppercase rounded-sm shadow-md"
          >
            Book a Demo <span className="text-sm font-light">→</span>
          </Link>

        </div>
      </section>
    </div>
  );
}
