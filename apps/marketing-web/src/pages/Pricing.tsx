import { Link } from "react-router-dom";
import { Card } from "@pos/ui";

export default function Pricing() {
  const comparisonRows = [
    { name: "Locations", starter: "1 location", growth: "Unlimited" },
    { name: "Registers", starter: "Up to 3", growth: "Unlimited" },
    { name: "Menu Architect", starter: "Standard", growth: "Advanced" },
    { name: "Kitchen Display System (KDS)", starter: "—", growth: "Included" },
    { name: "Analytics", starter: "Standard", growth: "Artisan Reports" },
    { name: "Support", starter: "Email & Chat", growth: "24/7 Priority Phone" },
    { name: "Custom Domains", starter: "—", growth: "Included" },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-left">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black font-serif text-zinc-100 tracking-tight leading-none">
          Pricing Plans
        </h1>
        <p className="text-zinc-450 text-sm md:text-base mt-6 max-w-2xl leading-relaxed font-light">
          Simple, transparent pricing built to scale with your hospitality business. No hidden fees.
        </p>
      </section>

      {/* Pricing Cards (2 Columns) */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-zinc-800/40 grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* Starter Plan */}
        <Card className="bg-zinc-900/20 border border-zinc-800 p-8 flex flex-col justify-between rounded-2xl">
          <div>
            <h3 className="font-bold font-serif text-zinc-100 text-xl">Starter</h3>
            <p className="text-zinc-450 text-xs mt-2 font-light">
              Perfect for single location cafes, bakeries, and boutique bistros.
            </p>
            <h2 className="text-4xl font-bold font-serif text-zinc-100 mt-6">$29<span className="text-xs font-sans text-zinc-500">/mo</span></h2>
            <ul className="mt-8 flex flex-col gap-3 text-xs text-zinc-400 font-light border-t border-zinc-800/50 pt-6">
              <li className="flex items-center gap-2">✓ 1 Location</li>
              <li className="flex items-center gap-2">✓ Up to 3 Registers</li>
              <li className="flex items-center gap-2">✓ Basic Menu Architect</li>
              <li className="flex items-center gap-2">✓ Standard Reporting</li>
              <li className="flex items-center gap-2">✓ Email & Chat Support</li>
            </ul>
          </div>
          <Link to="/contact?plan=starter" className="w-full text-center mt-8 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-350 text-xs font-semibold rounded-xl block transition-colors">
            Choose Starter
          </Link>
        </Card>

        {/* Growth Plan */}
        <Card className="bg-zinc-900/20 border border-violet-600 p-8 flex flex-col justify-between rounded-2xl relative shadow-lg">
          <span className="absolute -top-3 right-6 bg-violet-600 text-white text-[8px] uppercase tracking-widest font-black px-3 py-1 rounded-full">
            RECOMMENDED
          </span>
          <div>
            <h3 className="font-bold font-serif text-zinc-100 text-xl">Growth</h3>
            <p className="text-zinc-455 text-xs mt-2 font-light">
              Designed for high-volume restaurants and scaling establishments.
            </p>
            <h2 className="text-4xl font-bold font-serif text-zinc-100 mt-6">$79<span className="text-xs font-sans text-zinc-500">/mo</span></h2>
            <ul className="mt-8 flex flex-col gap-3 text-xs text-zinc-400 font-light border-t border-zinc-800/50 pt-6">
              <li className="flex items-center gap-2">✓ Unlimited Locations</li>
              <li className="flex items-center gap-2">✓ Unlimited Registers</li>
              <li className="flex items-center gap-2">✓ Advanced Menu Architect</li>
              <li className="flex items-center gap-2">✓ Artisan Reports & Insights</li>
              <li className="flex items-center gap-2">✓ Priority 24/7 Phone Support</li>
              <li className="flex items-center gap-2">✓ KDS Integrations</li>
            </ul>
          </div>
          <Link to="/contact?plan=growth" className="w-full text-center mt-8 py-3 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl block transition-colors shadow-sm">
            Choose Growth
          </Link>
        </Card>
      </section>

      {/* Feature Comparison Section */}
      <section className="max-w-4xl mx-auto px-6 py-20 border-t border-zinc-800/40 w-full mb-10">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold font-serif text-zinc-100 tracking-tight">Feature Comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                <th className="py-4 pr-4">Feature</th>
                <th className="py-4 px-4 text-center">Starter</th>
                <th className="py-4 pl-4 text-center">Growth</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-900/10">
                  <td className="py-4 pr-4 text-zinc-100 font-medium font-serif">{row.name}</td>
                  <td className="py-4 px-4 text-center text-zinc-450 font-light">{row.starter}</td>
                  <td className="py-4 pl-4 text-center text-zinc-300 font-semibold">{row.growth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
