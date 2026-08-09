import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import QRResolve from "./pages/QRResolve";
import Menu from "./pages/Menu";
import Tracker from "./pages/Tracker";

function DefaultLanding() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/20 via-zinc-950 to-zinc-950 -z-10" />
      <div className="w-16 h-16 bg-violet-600/10 border border-violet-500/20 rounded-full flex items-center justify-center mb-4 text-violet-400 text-2xl animate-bounce">
        📲
      </div>
      <h1 className="text-2xl font-black text-white tracking-tight">Scan QR Code</h1>
      <p className="text-zinc-400 text-sm mt-2 max-w-xs leading-relaxed font-light">
        Please scan the QR code located on your table to browse the menu and place your order.
      </p>
      <div className="mt-8 text-xs text-zinc-600">
        Demo test: visit <Link to="/r/gourmet-garden/t/table-token-1" className="text-violet-400 font-semibold hover:underline">/r/gourmet-garden/t/&lt;token&gt;</Link> directly.
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DefaultLanding />} />
        <Route path="/r/:slug/t/:qrToken" element={<QRResolve />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/tracker/:orderId" element={<Tracker />} />
      </Routes>
    </BrowserRouter>
  );
}
