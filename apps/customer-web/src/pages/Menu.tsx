import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { useSessionStore } from "../store/useSessionStore";
import { useCartStore } from "../store/useCartStore";
import { Button, Card, ItemCustomizerModal, CartDrawer } from "@pos/ui";
import { formatCurrency } from "@pos/utils";
import { Bell, ShoppingBag, Plus, Minus } from "lucide-react";

import { API_BASE_URL, SOCKET_URL } from "../config";

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

  // Customization Modal states
  const [customizingItem, setCustomizingItem] = useState<any | null>(null);

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
    const socket = io(SOCKET_URL);
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
            selectedVariant: i.selectedVariant,
            selectedVariants: i.selectedVariants,
            selectedModifiers: i.selectedModifiers,
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

  const handleOpenCustomize = (item: any) => {
    setCustomizingItem(item);
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
          const hasVariantsOrModifiers =
            (item.variantGroups && item.variantGroups.length > 0 && item.variantGroups.some((g: any) => g.options?.length > 0)) ||
            (item.modifierGroups && item.modifierGroups.length > 0 && item.modifierGroups.some((g: any) => g.options?.length > 0));

          const totalItemCartCount = items
            .filter((i) => i.menuItemId === item._id)
            .reduce((sum, i) => sum + i.quantity, 0);

          return (
            <Card
              key={item._id}
              onClick={() => {
                if (!isItemOutOfStock && hasVariantsOrModifiers) {
                  handleOpenCustomize(item);
                }
              }}
              className={`flex gap-4 p-4 items-start relative bg-zinc-900/50 hover:bg-zinc-900 transition-colors ${
                !isItemOutOfStock && hasVariantsOrModifiers ? "cursor-pointer" : ""
              }`}
            >
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
                    {hasVariantsOrModifiers && (
                      <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.2 rounded">
                        Customizable
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-400 text-xs mt-1.5 line-clamp-2 leading-relaxed font-light">{item.description}</p>

                  {/* Variant options preview chip */}
                  {item.variantGroups && item.variantGroups.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {item.variantGroups.map((vg: any, vIdx: number) => (
                        <div
                          key={vIdx}
                          className="flex items-center gap-1 text-[10px] bg-violet-950/40 border border-violet-800/40 text-violet-300 px-2 py-0.5 rounded-md"
                        >
                          <span className="font-semibold text-violet-400">{vg.name}:</span>
                          <span className="text-zinc-300 font-medium">{vg.options?.map((o: any) => o.name).join(" • ")}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Modifier preview chip */}
                  {item.modifierGroups && item.modifierGroups.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {item.modifierGroups.map((mg: any, mIdx: number) => (
                        <span
                          key={mIdx}
                          className="text-[9px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded"
                        >
                          +{mg.name}: {mg.options?.map((o: any) => o.name).join(", ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-900/40">
                  <span className="font-extrabold text-violet-400 text-sm">
                    {hasVariantsOrModifiers ? `From ${formatCurrency(item.price)}` : formatCurrency(item.price)}
                  </span>
                  
                  {isItemOutOfStock ? (
                    <span className="text-xs text-zinc-500 font-semibold px-2.5 py-1 bg-zinc-950 rounded-lg">Unavailable</span>
                  ) : hasVariantsOrModifiers ? (
                    <div className="flex items-center gap-1.5">
                      {totalItemCartCount > 0 && (
                        <span className="text-[10px] font-bold text-violet-300 bg-violet-950/70 border border-violet-800/70 px-2 py-1 rounded-lg">
                          {totalItemCartCount} in cart
                        </span>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleOpenCustomize(item)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                      >
                        {totalItemCartCount > 0 ? "+ Add" : "Customize"}
                      </Button>
                    </div>
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

      {/* Shared Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={items}
        onUpdateQuantity={updateQuantity}
        onUpdateInstructions={updateInstructions}
        onSubmit={handlePlaceOrder}
        title="Your Cart"
        submitLabel="Place Kitchen Order"
      />

      {/* Shared Item Customizer Modal */}
      <ItemCustomizerModal
        item={customizingItem}
        isOpen={!!customizingItem}
        onClose={() => setCustomizingItem(null)}
        onConfirm={(customized) => {
          addToCart(customized);
          setCustomizingItem(null);
        }}
      />
    </div>
  );
}
