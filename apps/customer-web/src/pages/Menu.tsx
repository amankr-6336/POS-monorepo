import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { useSessionStore } from "../store/useSessionStore";
import { useCartStore } from "../store/useCartStore";
import { Button, Card, Badge } from "@pos/ui";
import { formatCurrency } from "@pos/utils";
import { Bell, ShoppingBag, X, Minus, Plus, Trash, Sparkles } from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api/v1";

export default function Menu() {
  const navigate = useNavigate();
  const { restaurant, table, customer, customerToken } = useSessionStore();
  const { items, addToCart, updateQuantity, updateInstructions, clearCart } = useCartStore();

  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cartOpen, setCartOpen] = useState(false);
  
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cart totals
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Redirect if session is missing
  useEffect(() => {
    if (!restaurant || !table || !customerToken) {
      navigate("/");
    }
  }, [restaurant, table, customerToken, navigate]);

  // Fetch menu data and connect Socket
  useEffect(() => {
    if (!restaurant?.id) return;
    const rId = restaurant.id;

    async function fetchMenu() {
      try {
        const catRes = await fetch(`${API_BASE_URL}/restaurants/${rId}/categories`);
        const itemRes = await fetch(`${API_BASE_URL}/restaurants/${rId}/menu-items`);
        
        if (catRes.ok && itemRes.ok) {
          const cats = await catRes.json();
          const itms = await itemRes.json();
          setCategories(cats);
          setMenuItems(itms);
        }
      } catch (err) {
        console.error("Failed to load menu details:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();

    // Sockets listener for stock status changes
    const socket = io("http://localhost:5000");
    socket.emit("join-restaurant", restaurant.id);

    socket.on("menuItem:stockChanged", (data: any) => {
      setMenuItems((prev) =>
        prev.map((item) =>
          item._id === data.menuItemId
            ? { ...item, isAvailable: data.isAvailable, isOutOfStock: data.isOutOfStock }
            : item
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurant?.id]);

  const handleCallWaiter = async () => {
    if (waiterCalled) return;
    try {
      const res = await fetch(`${API_BASE_URL}/public/table-queries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ tableId: table?.id }),
      });
      if (res.ok) {
        setWaiterCalled(true);
        setTimeout(() => setWaiterCalled(false), 30000); // Reset button after 30s
        alert("Waiter has been called to your table!");
      }
    } catch (err) {
      console.error("Call Waiter failed:", err);
    }
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    try {
      const res = await fetch(`${API_BASE_URL}/public/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          tableId: table?.id,
          customerId: customer?.id,
          items: items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            specialInstructions: i.specialInstructions,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to place order");
      }

      const orderData = await res.json();
      clearCart();
      setCartOpen(false);
      navigate(`/tracker/${orderData._id}`);
    } catch (err: any) {
      alert(err.message || "Something went wrong.");
    }
  };

  const filteredItems = menuItems.filter((item) => {
    if (selectedCategory === "all") return true;
    return item.categoryId?._id === selectedCategory || item.categoryId === selectedCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-28 relative">
      {/* Sleek Header */}
      <header className="sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 z-30 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {restaurant?.logoUrl && (
            <img src={restaurant.logoUrl} alt={restaurant.name} className="w-10 h-10 rounded-xl object-cover border border-zinc-800" />
          )}
          <div>
            <h1 className="font-bold text-white tracking-tight">{restaurant?.name}</h1>
            <p className="text-[10px] text-zinc-400 font-medium">
              {table?.label} • Welcome, <span className="text-violet-400 font-semibold">{customer?.name}</span>
            </p>
          </div>
        </div>

        <Button
          variant="glass"
          size="sm"
          onClick={handleCallWaiter}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full shadow-sm transition-all ${
            waiterCalled ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 active:scale-100 cursor-not-allowed" : "text-amber-400 border-amber-500/20"
          }`}
        >
          <Bell className={`w-3.5 h-3.5 ${waiterCalled ? "" : "animate-bounce"}`} />
          {waiterCalled ? "Waiter Signalled" : "Call Waiter"}
        </Button>
      </header>

      {/* Category Tabs */}
      <div className="sticky top-[73px] bg-zinc-950/90 backdrop-blur-sm py-3 border-b border-zinc-900/40 z-20 overflow-x-auto scrollbar-hide px-4 flex gap-2">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
            selectedCategory === "all"
              ? "bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-600/10"
              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          All Items
        </button>
        {categories.map((cat) => (
          <button
            key={cat._id}
            onClick={() => setSelectedCategory(cat._id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedCategory === cat._id
                ? "bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-600/10"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu Item Grid */}
      <main className="px-4 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {filteredItems.map((item) => {
          const isItemOutOfStock = item.isOutOfStock || !item.isAvailable;
          const cartQty = items.find((i) => i.menuItemId === item._id)?.quantity || 0;

          return (
            <Card key={item._id} className="flex gap-4 p-4 items-start relative bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
              {item.imageUrl && (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-zinc-800 bg-zinc-950">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  {isItemOutOfStock && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Out of Stock</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex-1 flex flex-col justify-between min-h-[96px]">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-white text-sm tracking-tight leading-tight">{item.name}</h3>
                    {item.dietaryTags?.includes("veg") && (
                      <span className="w-2.5 h-2.5 border border-emerald-500 flex items-center justify-center rounded-[2px] p-[1px] shrink-0">
                        <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                      </span>
                    )}
                    {item.dietaryTags?.includes("non-veg") && (
                      <span className="w-2.5 h-2.5 border border-rose-500 flex items-center justify-center rounded-[2px] p-[1px] shrink-0">
                        <span className="w-1 h-1 bg-rose-500 rounded-full"></span>
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-400 text-xs mt-1.5 line-clamp-2 leading-relaxed font-light">{item.description}</p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-900/40">
                  <span className="font-extrabold text-violet-400 text-sm">{formatCurrency(item.price)}</span>
                  
                  {isItemOutOfStock ? (
                    <span className="text-xs text-zinc-500 font-semibold px-2.5 py-1 bg-zinc-950 rounded-lg">Unavailable</span>
                  ) : cartQty > 0 ? (
                    <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700/50 rounded-xl p-0.5 shadow-inner">
                      <button
                        onClick={() => updateQuantity(item._id, cartQty - 1)}
                        className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-300 active:scale-95"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-white w-4 text-center">{cartQty}</span>
                      <button
                        onClick={() => updateQuantity(item._id, cartQty + 1)}
                        className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-300 active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => addToCart({ menuItemId: item._id, name: item.name, price: item.price, imageUrl: item.imageUrl })}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                    >
                      Add
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </main>

      {/* Floating View Cart Banner */}
      {items.length > 0 && (
        <div className="fixed bottom-6 inset-x-4 max-w-md mx-auto z-40 animate-bounce no-print">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl p-4 flex items-center justify-between shadow-xl shadow-violet-500/20 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <span className="text-xs text-violet-200 block font-medium uppercase tracking-wider">{items.length} item{items.length > 1 ? "s" : ""} added</span>
                <span className="font-extrabold text-lg text-white">{formatCurrency(subtotal)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 font-bold text-sm tracking-wide bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10">
              View Cart &rarr;
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer Overlay */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end no-print">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setCartOpen(false)} />

          {/* Drawer Content */}
          <div className="relative bg-zinc-950 border-t border-zinc-800 rounded-t-3xl max-h-[85vh] flex flex-col w-full max-w-md mx-auto shadow-2xl overflow-hidden z-10">
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/30">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg">Your Cart</h3>
                <Badge variant="info">{items.length}</Badge>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Item list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {items.map((item) => (
                <div key={item.menuItemId} className="flex gap-4 p-3 bg-zinc-900/40 rounded-2xl border border-zinc-900/80">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-zinc-800" />
                  )}
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-white">{item.name}</h4>
                      <span className="text-sm font-extrabold text-violet-400">{formatCurrency(item.price * item.quantity)}</span>
                    </div>

                    {/* Special Instruction Input */}
                    <div className="mt-1">
                      <input
                        type="text"
                        placeholder="Add cooking notes (e.g. less spicy)..."
                        value={item.specialInstructions || ""}
                        onChange={(e) => updateInstructions(item.menuItemId, e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <button
                        onClick={() => updateQuantity(item.menuItemId, 0)}
                        className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                      >
                        <Trash className="w-3.5 h-3.5" /> Remove
                      </button>
                      <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-0.5">
                        <button
                          onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                          className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                          className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Summary */}
            <div className="p-5 border-t border-zinc-900 bg-zinc-900/20">
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex justify-between text-zinc-400 text-xs">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-400 text-xs font-light">
                  <span>Tax (5% GST included in final bill)</span>
                  <span>{formatCurrency(subtotal * 0.05)}</span>
                </div>
                <div className="flex justify-between text-white font-extrabold text-base pt-2 border-t border-zinc-900/60 mt-1">
                  <span>Order Total</span>
                  <span className="text-violet-400">{formatCurrency(subtotal + subtotal * 0.05)}</span>
                </div>
              </div>

              <Button onClick={handlePlaceOrder} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold shadow-lg shadow-violet-500/10">
                <Sparkles className="w-4 h-4" /> Place Kitchen Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
