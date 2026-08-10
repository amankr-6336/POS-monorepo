import React from "react";
import { Link, useLocation } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path
      ? "text-[#1C150E] font-semibold"
      : "text-[#6E6050] hover:text-[#1C150E] font-medium";
  };

  const handleScrollToLineFlow = (e: React.MouseEvent) => {
    if (location.pathname === "/") {
      e.preventDefault();
      const element = document.getElementById("line-flow");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <div className="bg-white text-[#2E251B] min-h-screen relative overflow-hidden flex flex-col justify-between font-sans">
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#EDE8E0]/70">
        <div className="max-w-7xl mx-auto px-6 py-4.5 flex items-center justify-between">
          
          {/* Logo on the Left */}
          <Link to="/" className="flex items-center gap-2">
            {/* Crossed Fork & Knife logo icon */}
            <svg className="w-5 h-5 text-[#1C150E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 2s-1 3-3 5H9c-2 0-3-2-3-5" />
              <path d="M11 7v10" />
              <path d="M14 17h-6" />
              <path d="M11 17v5" />
              <path d="M18 5v12a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V5" />
            </svg>
            <span className="text-[17px] font-bold font-serif text-[#1C150E] tracking-[0.18em] uppercase">THE RAIL</span>
          </Link>
          
          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a 
              href="/#line-flow" 
              onClick={handleScrollToLineFlow}
              className="text-xs uppercase tracking-wider text-[#6E6050] hover:text-[#1C150E] font-medium transition-colors cursor-pointer"
            >
              How it Works
            </a>
            <Link to="/about" className={`text-xs uppercase tracking-wider transition-colors ${isActive("/about")}`}>
              About
            </Link>
            <Link to="/pricing" className={`text-xs uppercase tracking-wider transition-colors ${isActive("/pricing")}`}>
              Pricing
            </Link>
          </nav>
          
          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <Link 
              to="/contact" 
              className="px-6 py-2.5 text-[11px] font-bold tracking-[0.15em] bg-[#1C150E] hover:bg-zinc-850 text-white transition-all uppercase"
            >
              Contact
            </Link>
            
            {/* Circular Profile/Avatar Icon Button */}
            <Link 
              to="/contact" 
              className="w-10 h-10 rounded-full border border-[#EDE8E0] flex items-center justify-center hover:bg-[#FCF5EB] transition-colors"
              aria-label="Account"
            >
              <svg className="w-4 h-4 text-[#1C150E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
          </div>
          
        </div>
      </header>

      {/* Main Content Page Container */}
      <main className="flex-1 bg-white">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#EDE8E0] bg-[#FCF5EB]">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Footer Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-[15px] font-bold font-serif text-[#1C150E] tracking-[0.18em] uppercase">THE RAIL</span>
          </Link>
          
          {/* Footer Links */}
          <div className="flex items-center gap-8">
            <Link to="/about" className="text-xs text-[#6E6050] hover:text-[#1C150E] transition-colors">Privacy</Link>
            <Link to="/pricing" className="text-xs text-[#6E6050] hover:text-[#1C150E] transition-colors">Terms</Link>
            <Link to="/contact" className="text-xs text-[#6E6050] hover:text-[#1C150E] transition-colors">Status</Link>
          </div>
          
          {/* Copyright */}
          <div className="text-[10px] tracking-[0.1em] font-medium text-[#6E6050] uppercase">
            © 2026 RAIL HOSPITALITY SYSTEM
          </div>
          
        </div>
      </footer>
      
    </div>
  );
}
