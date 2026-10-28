import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useCartStore } from "../store/useCartStore";
import { Button, Badge, Modal, ItemCustomizerModal, CartDrawer } from "@pos/ui";
import { formatCurrency } from "@pos/utils";
import {
  ShoppingBag,
  Plus,
  Edit3,
  Search,
  CheckCircle,
  AlertCircle,
  ChefHat,
  History,
} from "lucide-react";
import { API_BASE_URL } from "../config";

interface TableOrderBuilderModalProps {
  table: any | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted?: () => void;
}

export default function TableOrderBuilderModal({
  table,
  isOpen,
  onClose,
  onOrderCompleted,
}: TableOrderBuilderModalProps) {
  const { user, accessToken } = useAuthStore();
  const { items, addToCart, updateQuantity, updateInstructions, clearCart, setItems } = useCartStore();

  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [existingOrders, setExistingOrders] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"menu" | "existing">("menu");

  const [cartOpen, setCartOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<any | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch menu and table's current orders
  const loadMenuAndOrders = async () => {
    if (!user?.restaurantId || !table?._id) return;
    try {
      const [catsRes, itemsRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/restaurants/${user.restaurantId}/categories`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${API_BASE_URL}/restaurants/${user.restaurantId}/menu-items`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${API_BASE_URL}/restaurants/${user.restaurantId}/orders?tableId=${table._id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      if (catsRes.ok) setCategories(await catsRes.json());
      if (itemsRes.ok) setMenuItems(await itemsRes.json());
      if (ordersRes.ok) {
        const ords = await ordersRes.json();
        // Filter orders for active/unsettled
        const activeTableOrders = ords.filter((o: any) => o.status !== "billed" && o.status !== "cancelled");
        setExistingOrders(activeTableOrders);
        if (activeTableOrders.length > 0 && activeTab === "existing") {
          setActiveTab("existing");
        }
      }
    } catch (err) {
      console.error("Failed to load menu/orders:", err);
    }
  };

  useEffect(() => {
    if (isOpen && table?._id) {
      loadMenuAndOrders();
      clearCart();
      setEditingOrderId(null);
      setOrderNotes("");
      setNotification(null);
      setActiveTab("menu");
    }
  }, [isOpen, table?._id]);

  const handleStartEditingOrder = (order: any) => {
    setEditingOrderId(order._id);
    setOrderNotes(order.notes || "");
    const mappedItems = order.items
      .filter((i: any) => i.itemStatus !== "cancelled")
      .map((i: any) => ({
        id: `${i.menuItemId}_${Math.random().toString(36).substring(7)}`,
        menuItemId: i.menuItemId,
        name: i.name,
        price: i.price,
        basePrice: i.basePrice || i.price,
        quantity: i.quantity,
        specialInstructions: i.specialInstructions,
        selectedVariant: i.selectedVariant,
        selectedVariants: i.selectedVariants,
        selectedModifiers: i.selectedModifiers,
      }));
    setItems(mappedItems);
    setActiveTab("menu");
    setCartOpen(true);
  };

  const handleOpenCustomizer = (item: any) => {
    setCustomizingItem(item);
  };

  const handleSubmitOrder = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setNotification(null);

    try {
      const orderPayload = {
        tableId: table._id,
        tableSessionId: table.currentSessionId || undefined,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          specialInstructions: i.specialInstructions,
          selectedVariant: i.selectedVariant,
          selectedVariants: i.selectedVariants,
          selectedModifiers: i.selectedModifiers,
        })),
        notes: orderNotes,
      };

      let res;
      if (editingOrderId) {
        // Edit existing order
        res = await fetch(`${API_BASE_URL}/orders/${editingOrderId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(orderPayload),
        });
      } else {
        // Place new order on behalf of table
        res = await fetch(`${API_BASE_URL}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(orderPayload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit order");
      }

      setNotification({
        type: "success",
        message: editingOrderId
          ? `Order #${editingOrderId.slice(-4)} updated successfully by ${user?.name}!`
          : `Order placed on behalf of ${table.label}! Sent to kitchen KDS.`,
      });

      clearCart();
      setEditingOrderId(null);
      setCartOpen(false);
      loadMenuAndOrders();
      if (onOrderCompleted) onOrderCompleted();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Something went wrong placing the order",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !table) return null;

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" ||
      item.categoryId === selectedCategory ||
      item.categoryId?._id === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartTotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Staff Assisted Ordering — ${table.label} (${table.location})`}
      size="3xl"
    >
      <div className="flex flex-col gap-5 min-h-[600px]">
        {/* Header Tabs & Mode banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("menu")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "menu"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <ChefHat className="w-4 h-4" /> Menu & Item Customization
            </button>

            <button
              onClick={() => setActiveTab("existing")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "existing"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <History className="w-4 h-4" /> Table Orders ({existingOrders.length})
            </button>
          </div>

          {/* Active staff attribution pill */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Taking Order:</span>
            <span className="text-xs font-bold text-white flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {user?.name} ({user?.role})
            </span>
          </div>
        </div>

        {/* Editing indicator */}
        {editingOrderId && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              <span>
                Editing existing order <strong>#{editingOrderId.slice(-4)}</strong>. Modifying items will update kitchen and totals.
              </span>
            </div>
            <button
              onClick={() => {
                setEditingOrderId(null);
                clearCart();
              }}
              className="text-[10px] font-bold underline hover:text-white"
            >
              Cancel Edit (New Order)
            </button>
          </div>
        )}

        {/* Notifications */}
        {notification && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              notification.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Tab 1: Menu & Ordering */}
        {activeTab === "menu" && (
          <div className="flex flex-col gap-4 flex-1">
            {/* Search and Category Filters */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Categories horizontally scrollable */}
              <div className="flex gap-1.5 overflow-x-auto w-full max-w-full pb-1">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                    selectedCategory === "all"
                      ? "bg-violet-600 text-white"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  All Items
                </button>
                {categories.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => setSelectedCategory(c._id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                      selectedCategory === c._id
                        ? "bg-violet-600 text-white"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredItems.map((item) => {
                const hasVariants = item.variantGroups && item.variantGroups.length > 0;
                const hasModifiers = item.modifierGroups && item.modifierGroups.length > 0;
                const isCustomizable = hasVariants || hasModifiers;

                return (
                  <div
                    key={item._id}
                    onClick={() => {
                      if (!item.isAvailable || item.isOutOfStock) return;
                      handleOpenCustomizer(item);
                    }}
                    className={`p-3 bg-zinc-900/40 border border-zinc-850 rounded-2xl flex flex-col justify-between transition-all cursor-pointer hover:border-zinc-700 ${
                      !item.isAvailable || item.isOutOfStock ? "opacity-40 cursor-not-allowed" : "hover:scale-[1.01]"
                    }`}
                  >
                    <div className="flex gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-16 h-16 rounded-xl object-cover border border-zinc-800 shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-zinc-850 border border-zinc-800 flex items-center justify-center shrink-0">
                          <ChefHat className="w-6 h-6 text-zinc-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                          {item.dietaryTags?.includes("veg") && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Veg" />
                          )}
                          {item.dietaryTags?.includes("non-veg") && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Non-Veg" />
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5 font-light">
                          {item.description || "Freshly made to order"}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          {hasVariants && (
                            <span className="text-[9px] bg-violet-950/60 border border-violet-800/60 text-violet-300 px-1 py-0.2 rounded font-semibold">
                              Variants
                            </span>
                          )}
                          {hasModifiers && (
                            <span className="text-[9px] bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 px-1 py-0.2 rounded font-semibold">
                              Add-ons
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-850/60">
                      <span className="text-xs font-mono font-extrabold text-violet-400">
                        {formatCurrency(item.price)}
                      </span>
                      <Button
                        size="sm"
                        disabled={!item.isAvailable || item.isOutOfStock}
                        className="text-[10px] py-1 px-2.5 rounded-lg flex items-center gap-1 font-bold"
                      >
                        <Plus className="w-3 h-3" />
                        {isCustomizable ? "Customize" : "Add"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Existing Table Orders & Audit Log */}
        {activeTab === "existing" && (
          <div className="flex flex-col gap-4 flex-1 max-h-[440px] overflow-y-auto pr-1">
            {existingOrders.length === 0 ? (
              <div className="py-16 text-center text-zinc-500">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40 text-violet-400" />
                <p className="text-xs">No active orders found for this table session</p>
              </div>
            ) : (
              existingOrders.map((ord) => {
                const placedBy = (ord.placedByStaffId as any)?.name
                  ? `${(ord.placedByStaffId as any).name} (${(ord.placedByStaffId as any).role})`
                  : "Customer via QR";
                const lastEditedBy = (ord.lastEditedByStaffId as any)?.name
                  ? `${(ord.lastEditedByStaffId as any).name} (${(ord.lastEditedByStaffId as any).role})`
                  : null;

                return (
                  <div
                    key={ord._id}
                    className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-white text-xs">
                          Order #{ord._id.slice(-6)}
                        </span>
                        <Badge
                          variant={
                            ord.status === "placed"
                              ? "warning"
                              : ord.status === "confirmed"
                              ? "info"
                              : ord.status === "preparing"
                              ? "preparing"
                              : ord.status === "ready"
                              ? "ready"
                              : "neutral"
                          }
                          className="text-[9px]"
                        >
                          {ord.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-violet-400">
                          {formatCurrency(ord.total)}
                        </span>
                        {["placed", "confirmed"].includes(ord.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEditingOrder(ord)}
                            className="text-[10px] py-1 px-2.5 rounded-lg flex items-center gap-1 font-semibold"
                          >
                            <Edit3 className="w-3 h-3" /> Edit Order
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-850">
                      {ord.items.map((i: any, idx: number) => {
                        const vName = i.selectedVariant?.optionName || i.selectedVariants?.[0]?.optionName;
                        const modNames = i.selectedModifiers?.map((m: any) => m.optionName).join(", ");
                        return (
                          <div
                            key={idx}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] ${
                              i.itemStatus === "cancelled"
                                ? "bg-red-950/20 border-red-800/40 line-through text-zinc-500"
                                : "bg-zinc-950 border-zinc-800 text-zinc-200"
                            }`}
                          >
                            <span className="font-bold">{i.name}</span> x{i.quantity}
                            {vName && <span className="text-violet-400 ml-1 font-mono">({vName})</span>}
                            {modNames && <span className="text-emerald-400 ml-1 font-mono">+{modNames}</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Audit Information Footer */}
                    <div className="flex flex-wrap items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-850/60">
                      <div className="flex items-center gap-3">
                        <span>
                          <strong>Placed by:</strong> {placedBy}
                        </span>
                        {lastEditedBy && (
                          <span>
                            <strong>Last edited by:</strong> {lastEditedBy}
                          </span>
                        )}
                      </div>
                      <span>{new Date(ord.placedAt).toLocaleTimeString()}</span>
                    </div>

                    {/* Audit Log Entries if present */}
                    {ord.auditLog && ord.auditLog.length > 0 && (
                      <div className="bg-zinc-950/50 p-2 rounded-xl text-[10px] text-zinc-400 flex flex-col gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                          Audit History
                        </span>
                        {ord.auditLog.map((log: any, lIdx: number) => (
                          <div key={lIdx} className="flex justify-between">
                            <span>• {log.note || `${log.action} by ${log.staffName || "Staff"}`}</span>
                            <span className="text-zinc-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Floating Cart Button at bottom */}
        {items.length > 0 && (
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-600/20 text-violet-400 rounded-xl">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  {items.length} item{items.length > 1 ? "s" : ""} selected for {table.label}
                </span>
                <span className="text-xs font-mono font-extrabold text-violet-400">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>

            <Button
              onClick={() => setCartOpen(true)}
              className="py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-violet-500/20"
            >
              <span>Review & Place Order</span>
              <span>&rarr;</span>
            </Button>
          </div>
        )}

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

        {/* Shared Cart Drawer Component */}
        <CartDrawer
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          items={items}
          onUpdateQuantity={updateQuantity}
          onUpdateInstructions={updateInstructions}
          onSubmit={handleSubmitOrder}
          submitting={submitting}
          title={editingOrderId ? `Edit Order #${editingOrderId.slice(-4)}` : `Order Cart — ${table.label}`}
          submitLabel={editingOrderId ? "Save Order Changes" : `Send Order to Kitchen (${table.label})`}
          notes={orderNotes}
          onNotesChange={setOrderNotes}
        />
      </div>
    </Modal>
  );
}
