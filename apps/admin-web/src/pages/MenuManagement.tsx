import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Card, Button, Input, Modal, Badge } from "@pos/ui";
import { formatCurrency } from "@pos/utils";
import { Plus, ToggleLeft, ToggleRight, AlertTriangle, Trash2, ArrowUpRight, ArrowDownRight, Pencil } from "lucide-react";

import { API_BASE_URL } from "../config";

export default function MenuManagement() {
  const { user, accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"items" | "categories" | "inventory">("items");

  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  // Modal Open states
  const [catOpen, setCatOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [ingOpen, setIngOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  // Selected for edits/adjustments
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);

  // Form states - Category
  const [catName, setCatName] = useState("");
  const [subCatName, setSubCatName] = useState("");
  const [subCategories, setSubCategories] = useState<any[]>([]);

  // Form states - MenuItem
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState(0);
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemPrepStation, setItemPrepStation] = useState("main-kitchen");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemRecipe, setItemRecipe] = useState<{ ingredientId: string; quantity: number; unit: string }[]>([]);
  const [itemVariantGroups, setItemVariantGroups] = useState<any[]>([]);
  const [itemModifierGroups, setItemModifierGroups] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states - Ingredient
  const [ingName, setIngName] = useState("");
  const [ingUnit, setIngUnit] = useState<"g" | "kg" | "ml" | "l" | "pcs">("g");
  const [ingStock, setIngStock] = useState(0);
  const [ingThreshold, setIngThreshold] = useState(0);

  // Form states - Stock Adjustment
  const [adjustQty, setAdjustQty] = useState(0);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [catRes, itemRes, ingRes] = await Promise.all([
        fetch(`${API_BASE_URL}/restaurants/${user?.restaurantId}/categories`, { headers }),
        fetch(`${API_BASE_URL}/restaurants/${user?.restaurantId}/menu-items`, { headers }),
        fetch(`${API_BASE_URL}/restaurants/${user?.restaurantId}/ingredients`, { headers }),
      ]);

      if (catRes.ok) setCategories(await catRes.json());
      if (itemRes.ok) setMenuItems(await itemRes.json());
      if (ingRes.ok) setIngredients(await ingRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.restaurantId) fetchData();
  }, [user?.restaurantId]);

  // --- ACTIONS: CATEGORY ---
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;
    try {
      const res = await fetch(`${API_BASE_URL}/restaurants/${user?.restaurantId}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: catName,
          subcategories: subCategories,
        }),
      });
      if (res.ok) {
        setCatOpen(false);
        setCatName("");
        setSubCategories([]);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- ACTIONS: MENU ITEM ---
  const handleAddRecipeIngredient = (ingId: string) => {
    const ingDoc = ingredients.find((i) => i._id === ingId);
    if (!ingDoc) return;
    if (itemRecipe.some((r) => r.ingredientId === ingId)) return;
    setItemRecipe([...itemRecipe, { ingredientId: ingId, quantity: 1, unit: ingDoc.unit }]);
  };

  const handleUpdateRecipeQty = (ingId: string, quantity: number) => {
    setItemRecipe(
      itemRecipe.map((r) => (r.ingredientId === ingId ? { ...r, quantity: Math.max(0.1, quantity) } : r))
    );
  };

  // Helper for variant groups
  const handleAddVariantGroup = () => {
    setItemVariantGroups([
      ...itemVariantGroups,
      {
        name: "Size",
        options: [
          { name: "Small", priceDelta: 0, ingredientOverrides: [] },
          { name: "Medium", priceDelta: 0, ingredientOverrides: [] },
          { name: "Large", priceDelta: 0, ingredientOverrides: [] },
        ],
      },
    ]);
  };

  const handleUpdateVariantGroupName = (groupIndex: number, name: string) => {
    const updated = [...itemVariantGroups];
    updated[groupIndex].name = name;
    setItemVariantGroups(updated);
  };

  const handleRemoveVariantGroup = (groupIndex: number) => {
    setItemVariantGroups(itemVariantGroups.filter((_, idx) => idx !== groupIndex));
  };

  const handleAddVariantOption = (groupIndex: number) => {
    const updated = [...itemVariantGroups];
    updated[groupIndex].options.push({ name: "", priceDelta: 0, ingredientOverrides: [] });
    setItemVariantGroups(updated);
  };

  const handleUpdateVariantOption = (groupIndex: number, optionIndex: number, field: string, value: any) => {
    const updated = [...itemVariantGroups];
    updated[groupIndex].options[optionIndex][field] = value;
    setItemVariantGroups(updated);
  };

  const handleRemoveVariantOption = (groupIndex: number, optionIndex: number) => {
    const updated = [...itemVariantGroups];
    updated[groupIndex].options = updated[groupIndex].options.filter((_: any, idx: number) => idx !== optionIndex);
    setItemVariantGroups(updated);
  };

  const handleAddVariantOverride = (groupIndex: number, optionIndex: number, ingredientId: string) => {
    const ingDoc = ingredients.find((i) => i._id === ingredientId);
    if (!ingDoc) return;
    const updated = [...itemVariantGroups];
    const overrides = updated[groupIndex].options[optionIndex].ingredientOverrides || [];
    if (overrides.some((o: any) => o.ingredientId === ingredientId)) return;
    updated[groupIndex].options[optionIndex].ingredientOverrides = [
      ...overrides,
      { ingredientId, quantity: 1, unit: ingDoc.unit },
    ];
    setItemVariantGroups(updated);
  };

  const handleUpdateVariantOverrideQty = (groupIndex: number, optionIndex: number, overrideIndex: number, quantity: number) => {
    const updated = [...itemVariantGroups];
    updated[groupIndex].options[optionIndex].ingredientOverrides[overrideIndex].quantity = Math.max(0, quantity);
    setItemVariantGroups(updated);
  };

  const handleRemoveVariantOverride = (groupIndex: number, optionIndex: number, overrideIndex: number) => {
    const updated = [...itemVariantGroups];
    updated[groupIndex].options[optionIndex].ingredientOverrides = updated[groupIndex].options[optionIndex].ingredientOverrides.filter(
      (_: any, idx: number) => idx !== overrideIndex
    );
    setItemVariantGroups(updated);
  };

  // Helper for modifier groups
  const handleAddModifierGroup = () => {
    setItemModifierGroups([
      ...itemModifierGroups,
      {
        name: "",
        multiSelect: false,
        options: [{ name: "", priceDelta: 0, ingredients: [] }],
      },
    ]);
  };

  const handleUpdateModifierGroupName = (groupIndex: number, name: string) => {
    const updated = [...itemModifierGroups];
    updated[groupIndex].name = name;
    setItemModifierGroups(updated);
  };

  const handleToggleModifierGroupMulti = (groupIndex: number) => {
    const updated = [...itemModifierGroups];
    updated[groupIndex].multiSelect = !updated[groupIndex].multiSelect;
    setItemModifierGroups(updated);
  };

  const handleRemoveModifierGroup = (groupIndex: number) => {
    setItemModifierGroups(itemModifierGroups.filter((_, idx) => idx !== groupIndex));
  };

  const handleAddModifierOption = (groupIndex: number) => {
    const updated = [...itemModifierGroups];
    updated[groupIndex].options.push({ name: "", priceDelta: 0, ingredients: [] });
    setItemModifierGroups(updated);
  };

  const handleUpdateModifierOption = (groupIndex: number, optionIndex: number, field: string, value: any) => {
    const updated = [...itemModifierGroups];
    updated[groupIndex].options[optionIndex][field] = value;
    setItemModifierGroups(updated);
  };

  const handleRemoveModifierOption = (groupIndex: number, optionIndex: number) => {
    const updated = [...itemModifierGroups];
    updated[groupIndex].options = updated[groupIndex].options.filter((_: any, idx: number) => idx !== optionIndex);
    setItemModifierGroups(updated);
  };

  const handleAddModifierIngredient = (groupIndex: number, optionIndex: number, ingredientId: string) => {
    const ingDoc = ingredients.find((i) => i._id === ingredientId);
    if (!ingDoc) return;
    const updated = [...itemModifierGroups];
    const ings = updated[groupIndex].options[optionIndex].ingredients || [];
    if (ings.some((o: any) => o.ingredientId === ingredientId)) return;
    updated[groupIndex].options[optionIndex].ingredients = [
      ...ings,
      { ingredientId, quantity: 1, unit: ingDoc.unit },
    ];
    setItemModifierGroups(updated);
  };

  const handleUpdateModifierIngredientQty = (groupIndex: number, optionIndex: number, ingIndex: number, quantity: number) => {
    const updated = [...itemModifierGroups];
    updated[groupIndex].options[optionIndex].ingredients[ingIndex].quantity = Math.max(0.1, quantity);
    setItemModifierGroups(updated);
  };

  const handleRemoveModifierIngredient = (groupIndex: number, optionIndex: number, ingIndex: number) => {
    const updated = [...itemModifierGroups];
    updated[groupIndex].options[optionIndex].ingredients = updated[groupIndex].options[optionIndex].ingredients.filter(
      (_: any, idx: number) => idx !== ingIndex
    );
    setItemModifierGroups(updated);
  };

  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setItemName("");
    setItemDesc("");
    setItemPrice(0);
    setItemCategoryId("");
    setItemPrepStation("main-kitchen");
    setItemImageUrl("");
    setItemRecipe([]);
    setItemVariantGroups([]);
    setItemModifierGroups([]);
    setItemOpen(true);
  };

  const handleOpenEditItem = (item: any) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemDesc(item.description || "");
    setItemPrice(item.price);
    setItemCategoryId(item.categoryId?._id || item.categoryId || "");
    setItemPrepStation(item.prepStation || "main-kitchen");
    setItemImageUrl(item.imageUrl || "");
    setItemRecipe(
      item.ingredients ? item.ingredients.map((r: any) => ({
        ingredientId: r.ingredientId?._id || r.ingredientId,
        quantity: r.quantity,
        unit: r.unit
      })) : []
    );
    setItemVariantGroups(
      item.variantGroups
        ? item.variantGroups.map((vg: any) => ({
            name: vg.name || "",
            options: (vg.options || []).map((opt: any) => ({
              name: opt.name || "",
              priceDelta: opt.priceDelta || 0,
              ingredientOverrides: (opt.ingredientOverrides || []).map((io: any) => ({
                ingredientId: io.ingredientId?._id || io.ingredientId,
                quantity: io.quantity,
                unit: io.unit,
              })),
            })),
          }))
        : []
    );
    setItemModifierGroups(
      item.modifierGroups
        ? item.modifierGroups.map((mg: any) => ({
            name: mg.name || "",
            multiSelect: !!mg.multiSelect,
            options: (mg.options || []).map((opt: any) => ({
              name: opt.name || "",
              priceDelta: opt.priceDelta || 0,
              ingredients: (opt.ingredients || []).map((mi: any) => ({
                ingredientId: mi.ingredientId?._id || mi.ingredientId,
                quantity: mi.quantity,
                unit: mi.unit,
              })),
            })),
          }))
        : []
    );
    setItemOpen(true);
  };

  const handleCloseItemModal = () => {
    setItemOpen(false);
    setEditingItem(null);
    setItemName("");
    setItemDesc("");
    setItemPrice(0);
    setItemCategoryId("");
    setItemPrepStation("main-kitchen");
    setItemImageUrl("");
    setItemRecipe([]);
    setItemVariantGroups([]);
    setItemModifierGroups([]);
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !itemCategoryId || itemPrice <= 0) {
      alert("Please provide dish name, category, and a valid base price (> 0).");
      return;
    }

    // Validate variant groups explicitly so user input is never silently dropped
    for (let i = 0; i < itemVariantGroups.length; i++) {
      const vg = itemVariantGroups[i];
      if (!vg.name || !vg.name.trim()) {
        alert(`Please enter a group name (e.g. "Size") for Variant Group #${i + 1}`);
        return;
      }
      const namedOptions = (vg.options || []).filter((opt: any) => opt.name && opt.name.trim());
      if (namedOptions.length === 0) {
        alert(`Please add at least one named option (e.g. "Small", "Medium", "Large") for Variant Group "${vg.name}"`);
        return;
      }
    }

    // Validate modifier groups
    for (let i = 0; i < itemModifierGroups.length; i++) {
      const mg = itemModifierGroups[i];
      if (!mg.name || !mg.name.trim()) {
        alert(`Please enter a group name (e.g. "Add-ons") for Modifier Group #${i + 1}`);
        return;
      }
      const namedOptions = (mg.options || []).filter((opt: any) => opt.name && opt.name.trim());
      if (namedOptions.length === 0) {
        alert(`Please add at least one named option (e.g. "Extra Cheese") for Modifier Group "${mg.name}"`);
        return;
      }
    }

    const cleanedVariantGroups = itemVariantGroups
      .filter((vg) => vg.name && vg.name.trim())
      .map((vg) => ({
        name: vg.name.trim(),
        options: (vg.options || [])
          .filter((opt: any) => opt.name && opt.name.trim())
          .map((opt: any) => ({
            name: opt.name.trim(),
            priceDelta: Number(opt.priceDelta) || 0,
            ingredientOverrides: (opt.ingredientOverrides || [])
              .filter((io: any) => io.ingredientId)
              .map((io: any) => ({
                ingredientId: io.ingredientId,
                quantity: Number(io.quantity) || 0,
                unit: io.unit,
              })),
          })),
      }))
      .filter((vg) => vg.options.length > 0);

    const cleanedModifierGroups = itemModifierGroups
      .filter((mg) => mg.name && mg.name.trim())
      .map((mg) => ({
        name: mg.name.trim(),
        multiSelect: !!mg.multiSelect,
        options: (mg.options || [])
          .filter((opt: any) => opt.name && opt.name.trim())
          .map((opt: any) => ({
            name: opt.name.trim(),
            priceDelta: Number(opt.priceDelta) || 0,
            ingredients: (opt.ingredients || [])
              .filter((mi: any) => mi.ingredientId)
              .map((mi: any) => ({
                ingredientId: mi.ingredientId,
                quantity: Number(mi.quantity) || 0,
                unit: mi.unit,
              })),
          })),
      }))
      .filter((mg) => mg.options.length > 0);

    try {
      const url = editingItem
        ? `${API_BASE_URL}/menu-items/${editingItem._id}`
        : `${API_BASE_URL}/restaurants/${user?.restaurantId}/menu-items`;
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: itemName,
          description: itemDesc,
          price: itemPrice,
          categoryId: itemCategoryId,
          imageUrl: itemImageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&h=300&q=80",
          ingredients: itemRecipe,
          variantGroups: cleanedVariantGroups,
          modifierGroups: cleanedModifierGroups,
          prepStation: itemPrepStation,
        }),
      });

      if (res.ok) {
        handleCloseItemModal();
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || "Failed to save menu item");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to connect to the server.");
    }
  };

  const handleToggleStock = async (itemId: string, currentStockFlag: boolean) => {
    try {
      const res = await fetch(`${API_BASE_URL}/menu-items/${itemId}/toggle-stock`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ isOutOfStock: !currentStockFlag }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Delete this menu item?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/menu-items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- ACTIONS: INGREDIENT & ADJUSTMENT ---
  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingName) return;

    try {
      const res = await fetch(`${API_BASE_URL}/restaurants/${user?.restaurantId}/ingredients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: ingName,
          unit: ingUnit,
          currentStock: ingStock,
          lowStockThreshold: ingThreshold,
        }),
      });

      if (res.ok) {
        setIngOpen(false);
        setIngName("");
        setIngStock(0);
        setIngThreshold(0);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient) return;

    try {
      const res = await fetch(`${API_BASE_URL}/ingredients/${selectedIngredient._id}/adjust-stock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ adjustmentQuantity: adjustQty }),
      });

      if (res.ok) {
        setAdjustOpen(false);
        setSelectedIngredient(null);
        setAdjustQty(0);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Menu & Inventory</h1>
          <p className="text-zinc-400 text-sm mt-1">Configure categories, items, and track raw ingredients</p>
        </div>

        {/* Buttons based on active tab (admin/manager only) */}
        {["owner", "manager"].includes(user?.role || "") && (
          <>
            {activeTab === "items" && (
              <Button onClick={handleOpenCreateItem} className="flex items-center gap-1.5 rounded-xl font-bold py-2.5">
                <Plus className="w-4 h-4" /> Add Menu Item
              </Button>
            )}
            {activeTab === "categories" && (
              <Button onClick={() => setCatOpen(true)} className="flex items-center gap-1.5 rounded-xl font-bold py-2.5">
                <Plus className="w-4 h-4" /> Add Category
              </Button>
            )}
            {activeTab === "inventory" && (
              <Button onClick={() => setIngOpen(true)} className="flex items-center gap-1.5 rounded-xl font-bold py-2.5">
                <Plus className="w-4 h-4" /> Add Ingredient
              </Button>
            )}
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-900 gap-6">
        {(["items", "categories", "inventory"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 font-bold text-sm tracking-wide capitalize relative border-b-2 transition-all ${activeTab === tab ? "border-violet-500 text-black" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
          >
            {tab === "items" ? "Menu Items" : tab}
          </button>
        ))}
      </div>

      {/* Tab contents */}
      <div className="mt-2">
        {/* TAB 1: MENU ITEMS */}
        {activeTab === "items" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {menuItems.map((item) => (
              <Card key={item._id} className="flex gap-4 items-start bg-zinc-900/30 border-zinc-900 relative">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover border border-zinc-800 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-1">
                    <h3 className="font-extrabold text-white text-sm truncate leading-none">{item.name}</h3>
                    {["owner", "manager", "chef"].includes(user?.role || "") && (
                      <button
                        onClick={() => handleToggleStock(item._id, item.isOutOfStock)}
                        className="text-zinc-500 hover:text-white shrink-0"
                      >
                        {item.isOutOfStock ? (
                          <ToggleLeft className="w-6 h-6 text-zinc-600" />
                        ) : (
                          <ToggleRight className="w-6 h-6 text-violet-500" />
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">{item.categoryId?.name}</p>
                  <p className="text-zinc-400 text-[11px] mt-1.5 line-clamp-2 leading-relaxed">{item.description}</p>

                  {/* Variants and Modifiers Badges */}
                  {item.variantGroups && item.variantGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.variantGroups.map((vg: any, idx: number) => (
                        <span key={idx} className="text-[9px] bg-violet-500/10 text-violet-300 border border-violet-500/20 px-1.5 py-0.5 rounded font-medium">
                          {vg.name} ({vg.options?.length || 0})
                        </span>
                      ))}
                    </div>
                  )}
                  {item.modifierGroups && item.modifierGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.modifierGroups.map((mg: any, idx: number) => (
                        <span key={idx} className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded font-medium">
                          {mg.name} ({mg.options?.length || 0})
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-zinc-900">
                    <span className="font-extrabold text-violet-400 text-xs">{formatCurrency(item.price)}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={item.isOutOfStock ? "error" : "success"} className="py-0.5 px-2 text-[9px]">
                        {item.isOutOfStock ? "Sold Out" : "Active"}
                      </Badge>
                      {["owner", "manager"].includes(user?.role || "") && (
                        <>
                          <button
                            onClick={() => handleOpenEditItem(item)}
                            className="p-1 hover:bg-zinc-805 rounded-lg text-zinc-500 hover:text-white"
                            title="Edit Menu Item"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item._id)}
                            className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-600 hover:text-red-400"
                            title="Delete Menu Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* TAB 2: CATEGORIES */}
        {activeTab === "categories" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <Card key={cat._id} className="bg-zinc-900/30 border-zinc-900 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-white text-base leading-none">{cat.name}</h3>
                  <div className="mt-3 flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Subcategories</span>
                    {cat.subcategories.length === 0 ? (
                      <span className="text-xs text-zinc-600 font-light">None configured</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {cat.subcategories.map((sc: any) => (
                          <Badge key={sc._id} variant="neutral" className="text-[9px] py-0.5">
                            {sc.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t border-zinc-900 pt-3.5 mt-4 text-[10px] text-zinc-500 font-medium">
                  Sort Order Value: {cat.order}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* TAB 3: INVENTORY */}
        {activeTab === "inventory" && (
          <div className="overflow-x-auto border border-zinc-900 rounded-2xl bg-zinc-900/10">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-400 text-xs font-semibold uppercase bg-zinc-950/40">
                  <th className="p-4">Ingredient</th>
                  <th className="p-4">Current Stock</th>
                  <th className="p-4">Threshold</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60 text-zinc-300">
                {ingredients.map((ing) => {
                  const isLow = ing.currentStock <= ing.lowStockThreshold;
                  return (
                    <tr key={ing._id} className="hover:bg-zinc-900/10 transition-colors">
                      <td className="p-4 font-bold text-black text-xs">{ing.name}</td>
                      <td className="p-4 font-mono font-bold text-xs">
                        {ing.currentStock} {ing.unit}
                      </td>
                      <td className="p-4 text-xs font-mono text-zinc-500">
                        {ing.lowStockThreshold} {ing.unit}
                      </td>
                      <td className="p-4">
                        {isLow ? (
                          <Badge variant="error" className="py-0.5 px-2 text-[9px] flex items-center gap-1 max-w-fit">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="success" className="py-0.5 px-2 text-[9px] max-w-fit">Normal</Badge>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {["owner", "manager", "chef"].includes(user?.role || "") ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedIngredient(ing);
                              setAdjustOpen(true);
                            }}
                            className="text-[10px] rounded-lg px-2.5 py-1 text-zinc-400 hover:text-white border border-zinc-800"
                          >
                            Adjust Stock
                          </Button>
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD CATEGORY */}
      <Modal isOpen={catOpen} onClose={() => setCatOpen(false)} title="Create Category">
        <form onSubmit={handleCreateCategory} className="flex flex-col gap-4">
          <Input
            label="Category Name"
            placeholder="Starters, Main Course, Drinks"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
          />

          <div className="pt-2">
            <label className="text-xs font-semibold text-zinc-400 tracking-wider uppercase block mb-1.5">Add Subcategories</label>
            <div className="flex gap-2">
              <Input
                placeholder="Soups, Mocktails"
                value={subCatName}
                onChange={(e) => setSubCatName(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (subCatName.trim()) {
                    setSubCategories([...subCategories, { name: subCatName.trim(), order: subCategories.length }]);
                    setSubCatName("");
                  }
                }}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {subCategories.map((sc, i) => (
                <Badge key={i} variant="neutral" className="text-[9px] py-1 pl-2.5 pr-1.5 flex items-center gap-1.5">
                  {sc.name}
                  <button type="button" onClick={() => setSubCategories(subCategories.filter((_, idx) => idx !== i))} className="text-zinc-500 hover:text-white">✕</button>
                </Badge>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full mt-4">Save Category</Button>
        </form>
      </Modal>

      {/* MODAL: ADD INGREDIENT */}
      <Modal isOpen={ingOpen} onClose={() => setIngOpen(false)} title="Create Raw Ingredient">
        <form onSubmit={handleCreateIngredient} className="flex flex-col gap-4">
          <Input
            label="Ingredient Name"
            placeholder="Cheese, Paneer, Tomato"
            value={ingName}
            onChange={(e) => setIngName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Unit</label>
              <select
                value={ingUnit}
                onChange={(e: any) => setIngUnit(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 transition-all focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm"
              >
                <option value="g">Grams (g)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="ml">Milliliters (ml)</option>
                <option value="l">Liters (l)</option>
                <option value="pcs">Pieces (pcs)</option>
              </select>
            </div>
            <Input
              label="Initial Stock"
              type="number"
              value={ingStock}
              onChange={(e) => setIngStock(parseFloat(e.target.value))}
            />
          </div>
          <Input
            label="Low Stock Alert Threshold"
            type="number"
            value={ingThreshold}
            onChange={(e) => setIngThreshold(parseFloat(e.target.value))}
          />

          <Button type="submit" className="w-full mt-4">Save Ingredient</Button>
        </form>
      </Modal>

      {/* MODAL: MANUAL STOCK ADJUSTMENT */}
      {selectedIngredient && (
        <Modal isOpen={adjustOpen} onClose={() => setAdjustOpen(false)} title={`Stock Adjustment — ${selectedIngredient.name}`}>
          <form onSubmit={handleAdjustStock} className="flex flex-col gap-4">
            <p className="text-xs text-zinc-400 leading-relaxed font-light">
              Enter a positive value to register restock deliveries, or a negative value to log waste ingredients.
            </p>

            <Input
              label={`Quantity Adjustment (Current: ${selectedIngredient.currentStock} ${selectedIngredient.unit})`}
              type="number"
              placeholder="+500 or -200"
              value={adjustQty || ""}
              onChange={(e) => setAdjustQty(parseFloat(e.target.value))}
            />

            <div className="flex gap-2.5 mt-4">
              <Button
                type="submit"
                className="flex-1 flex items-center justify-center gap-1.5"
                onClick={() => setAdjustQty(Math.abs(adjustQty))}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-400" /> Restock
              </Button>
              <Button
                type="submit"
                variant="secondary"
                className="flex-1 flex items-center justify-center gap-1.5 hover:bg-zinc-800 text-amber-400 hover:text-amber-300"
                onClick={() => setAdjustQty(-Math.abs(adjustQty))}
              >
                <ArrowDownRight className="w-4 h-4 text-rose-400" /> Waste Entry
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: ADD MENU ITEM & RECIPE LINKING */}
      <Modal isOpen={itemOpen} onClose={handleCloseItemModal} title={editingItem ? "Edit Menu Item" : "Create Menu Item"} size="2xl">
        <form onSubmit={handleSaveMenuItem} className="flex flex-col gap-4">
          <Input
            label="Dish Name"
            placeholder="Margherita Pizza, Tuscan Salad"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <Input
            label="Dish Description"
            placeholder="Woodfired pizza base topped with san marzano..."
            value={itemDesc}
            onChange={(e) => setItemDesc(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price ($)"
              type="number"
              step="0.01"
              value={itemPrice || ""}
              onChange={(e) => setItemPrice(parseFloat(e.target.value))}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Category</label>
              <select
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Kitchen Prep Station</label>
              <select
                value={itemPrepStation}
                onChange={(e) => setItemPrepStation(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm"
              >
                <option value="main-kitchen">Main Kitchen</option>
                <option value="grill">Grill Station</option>
                <option value="tandoor">Tandoor Station</option>
                <option value="bar">Bar Counter</option>
                <option value="dessert">Dessert Station</option>
              </select>
            </div>
            <Input
              label="Demo Image URL"
              placeholder="https://images.unsplash..."
              value={itemImageUrl}
              onChange={(e) => setItemImageUrl(e.target.value)}
            />
          </div>

          {/* Recipe Builder */}
          <div className="pt-2 border-t border-zinc-850 mt-2">
            <label className="text-xs font-semibold text-zinc-400 tracking-wider uppercase block mb-1">Recipe Ingredients Linking</label>
            <span className="text-[10px] text-zinc-500 block mb-3 leading-normal">
              Select ingredients from inventory to deduct stock dynamically when order gets confirmed.
            </span>

            <div className="flex flex-col gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddRecipeIngredient(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-xl text-zinc-400 text-xs focus:outline-none"
              >
                <option value="">Select ingredient to add...</option>
                {ingredients.map((ing) => (
                  <option key={ing._id} value={ing._id}>
                    {ing.name} ({ing.unit})
                  </option>
                ))}
              </select>

              {/* Added recipe list */}
              <div className="flex flex-col gap-2 mt-2">
                {itemRecipe.map((rec) => {
                  const ingDoc = ingredients.find((i) => i._id === rec.ingredientId);
                  return (
                    <div key={rec.ingredientId} className="flex items-center justify-between p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <span className="text-xs font-bold text-white">{ingDoc?.name}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={rec.quantity}
                          onChange={(e) => handleUpdateRecipeQty(rec.ingredientId, parseFloat(e.target.value))}
                          className="w-16 px-2.5 py-1 text-center font-mono text-xs rounded-lg bg-zinc-900 border-zinc-800"
                        />
                        <span className="text-xs text-zinc-500 font-mono w-6">{rec.unit}</span>
                        <button
                          type="button"
                          onClick={() => setItemRecipe(itemRecipe.filter((r) => r.ingredientId !== rec.ingredientId))}
                          className="text-zinc-600 hover:text-red-400 p-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Variant Groups (Required Single-Choice) */}
          <div className="pt-3 border-t border-zinc-850 mt-2">
            <div className="flex items-center justify-between mb-1">
              <div>
                <label className="text-xs font-semibold text-zinc-300 tracking-wider uppercase block">
                  Variant Groups (Required Single-Choice)
                </label>
                <span className="text-[10px] text-zinc-500 block leading-normal">
                  e.g. "Size" (Small, Medium, Large) or "Portion". Customer must pick exactly one option.
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddVariantGroup}
                className="text-xs py-1 px-2.5 rounded-lg border border-zinc-800 hover:bg-zinc-800"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Variant Group
              </Button>
            </div>

            {itemVariantGroups.length === 0 ? (
              <div className="text-[11px] text-zinc-600 italic py-2">No variant groups defined (dish has single fixed price).</div>
            ) : (
              <div className="flex flex-col gap-4 mt-2">
                {itemVariantGroups.map((vg, gIdx) => (
                  <div key={gIdx} className="p-3.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-violet-400 uppercase tracking-wider block mb-1">
                          Variant Group Name * (e.g. Size, Portion)
                        </label>
                        <Input
                          placeholder="e.g. Size"
                          value={vg.name}
                          onChange={(e) => handleUpdateVariantGroupName(gIdx, e.target.value)}
                          className="font-bold text-xs"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveVariantGroup(gIdx)}
                        className="text-zinc-500 hover:text-red-400 p-1.5 mt-5"
                        title="Remove Variant Group"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex flex-col gap-2 pl-2 border-l-2 border-violet-500/40">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">Options</span>
                      {vg.options.map((opt: any, oIdx: number) => (
                        <div key={oIdx} className="p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-850 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Option name, e.g. Large"
                              value={opt.name}
                              onChange={(e) => handleUpdateVariantOption(gIdx, oIdx, "name", e.target.value)}
                              className="flex-1 text-xs"
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-zinc-400">+$</span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Price Delta"
                                value={opt.priceDelta}
                                onChange={(e) => handleUpdateVariantOption(gIdx, oIdx, "priceDelta", parseFloat(e.target.value) || 0)}
                                className="w-20 text-xs text-center font-mono"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveVariantOption(gIdx, oIdx)}
                              className="text-zinc-600 hover:text-red-400 p-1"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Ingredient quantity overrides */}
                          <div className="pl-2 border-l border-zinc-800 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] uppercase font-bold text-zinc-500">Ingredient Overrides (Optional)</span>
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddVariantOverride(gIdx, oIdx, e.target.value);
                                    e.target.value = "";
                                  }
                                }}
                                className="text-[10px] bg-zinc-950 border border-zinc-800 text-zinc-400 rounded px-1.5 py-0.5"
                              >
                                <option value="">+ Add Override...</option>
                                {ingredients.map((ing) => (
                                  <option key={ing._id} value={ing._id}>
                                    {ing.name} ({ing.unit})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {(opt.ingredientOverrides || []).map((io: any, ioIdx: number) => {
                              const ingDoc = ingredients.find((i) => i._id === io.ingredientId);
                              return (
                                <div key={ioIdx} className="flex items-center justify-between text-xs bg-zinc-950/50 p-1.5 rounded">
                                  <span className="text-zinc-300 text-[11px]">{ingDoc?.name}</span>
                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      type="number"
                                      step="0.1"
                                      value={io.quantity}
                                      onChange={(e) => handleUpdateVariantOverrideQty(gIdx, oIdx, ioIdx, parseFloat(e.target.value) || 0)}
                                      className="w-14 px-1.5 py-0.5 text-xs text-center font-mono"
                                    />
                                    <span className="text-[10px] text-zinc-500">{io.unit || ingDoc?.unit}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveVariantOverride(gIdx, oIdx, ioIdx)}
                                      className="text-zinc-600 hover:text-red-400 text-xs ml-1"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddVariantOption(gIdx)}
                        className="text-[11px] py-1 text-violet-400 hover:text-violet-300 self-start"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Option
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modifier Groups (Optional Add-ons) */}
          <div className="pt-3 border-t border-zinc-850 mt-2">
            <div className="flex items-center justify-between mb-1">
              <div>
                <label className="text-xs font-semibold text-zinc-300 tracking-wider uppercase block">
                  Modifier Groups (Optional Add-ons)
                </label>
                <span className="text-[10px] text-zinc-500 block leading-normal">
                  e.g. "Add-ons" (Extra Cheese, Bacon, Jalapenos). Single or multi-select.
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddModifierGroup}
                className="text-xs py-1 px-2.5 rounded-lg border border-zinc-800 hover:bg-zinc-800"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Modifier Group
              </Button>
            </div>

            {itemModifierGroups.length === 0 ? (
              <div className="text-[11px] text-zinc-600 italic py-2">No modifier groups defined.</div>
            ) : (
              <div className="flex flex-col gap-4 mt-2">
                {itemModifierGroups.map((mg, gIdx) => (
                  <div key={gIdx} className="p-3.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                          Modifier Group Name * (e.g. Add-ons, Extra Toppings)
                        </label>
                        <Input
                          placeholder="e.g. Add-ons"
                          value={mg.name}
                          onChange={(e) => handleUpdateModifierGroupName(gIdx, e.target.value)}
                          className="font-bold text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-5">
                        <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={mg.multiSelect}
                            onChange={() => handleToggleModifierGroupMulti(gIdx)}
                            className="rounded text-violet-600 focus:ring-violet-500"
                          />
                          Multi-Select
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveModifierGroup(gIdx)}
                          className="text-zinc-500 hover:text-red-400 p-1.5"
                          title="Remove Modifier Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pl-2 border-l-2 border-indigo-500/40">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">Options</span>
                      {mg.options.map((opt: any, oIdx: number) => (
                        <div key={oIdx} className="p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-850 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Option name, e.g. Extra Cheese"
                              value={opt.name}
                              onChange={(e) => handleUpdateModifierOption(gIdx, oIdx, "name", e.target.value)}
                              className="flex-1 text-xs"
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-zinc-400">+$</span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Price Delta"
                                value={opt.priceDelta}
                                onChange={(e) => handleUpdateModifierOption(gIdx, oIdx, "priceDelta", parseFloat(e.target.value) || 0)}
                                className="w-20 text-xs text-center font-mono"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveModifierOption(gIdx, oIdx)}
                              className="text-zinc-600 hover:text-red-400 p-1"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Additional ingredients consumed */}
                          <div className="pl-2 border-l border-zinc-800 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] uppercase font-bold text-zinc-500">Additional Ingredients (Optional)</span>
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddModifierIngredient(gIdx, oIdx, e.target.value);
                                    e.target.value = "";
                                  }
                                }}
                                className="text-[10px] bg-zinc-950 border border-zinc-800 text-zinc-400 rounded px-1.5 py-0.5"
                              >
                                <option value="">+ Add Ingredient...</option>
                                {ingredients.map((ing) => (
                                  <option key={ing._id} value={ing._id}>
                                    {ing.name} ({ing.unit})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {(opt.ingredients || []).map((mi: any, miIdx: number) => {
                              const ingDoc = ingredients.find((i) => i._id === mi.ingredientId);
                              return (
                                <div key={miIdx} className="flex items-center justify-between text-xs bg-zinc-950/50 p-1.5 rounded">
                                  <span className="text-zinc-300 text-[11px]">{ingDoc?.name}</span>
                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      type="number"
                                      step="0.1"
                                      value={mi.quantity}
                                      onChange={(e) => handleUpdateModifierIngredientQty(gIdx, oIdx, miIdx, parseFloat(e.target.value) || 0)}
                                      className="w-14 px-1.5 py-0.5 text-xs text-center font-mono"
                                    />
                                    <span className="text-[10px] text-zinc-500">{mi.unit || ingDoc?.unit}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveModifierIngredient(gIdx, oIdx, miIdx)}
                                      className="text-zinc-600 hover:text-red-400 text-xs ml-1"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddModifierOption(gIdx)}
                        className="text-[11px] py-1 text-indigo-400 hover:text-indigo-300 self-start"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Option
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full mt-4">Save Menu Item</Button>
        </form>
      </Modal>
    </div>
  );
}
