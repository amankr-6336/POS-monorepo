import { create } from "zustand";

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
  imageUrl?: string;
}

interface CartState {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeFromCart: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateInstructions: (menuItemId: string, instructions: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  
  addToCart: (item) => {
    const existing = get().items.find((i) => i.menuItemId === item.menuItemId);
    let newItems;
    if (existing) {
      newItems = get().items.map((i) =>
        i.menuItemId === item.menuItemId
          ? { ...i, quantity: i.quantity + (item.quantity || 1) }
          : i
      );
    } else {
      newItems = [...get().items, { ...item, quantity: item.quantity || 1 }];
    }
    set({ items: newItems });
  },
  
  removeFromCart: (menuItemId) => {
    set({ items: get().items.filter((i) => i.menuItemId !== menuItemId) });
  },
  
  updateQuantity: (menuItemId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(menuItemId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.menuItemId === menuItemId ? { ...i, quantity } : i
      ),
    });
  },
  
  updateInstructions: (menuItemId, specialInstructions) => {
    set({
      items: get().items.map((i) =>
        i.menuItemId === menuItemId ? { ...i, specialInstructions } : i
      ),
    });
  },
  
  clearCart: () => set({ items: [] }),
}));
