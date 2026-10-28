import { create } from "zustand";
import {
  SharedCartItem as CartItem,
  addToCartList,
  removeFromCartList,
  updateCartItemQuantity,
  updateCartItemInstructions,
} from "@pos/utils";

export type { CartItem };

interface CartState {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeFromCart: (idOrMenuItemId: string) => void;
  updateQuantity: (idOrMenuItemId: string, quantity: number) => void;
  updateInstructions: (idOrMenuItemId: string, instructions: string) => void;
  setItems: (items: CartItem[]) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  
  addToCart: (item) => {
    set({ items: addToCartList(get().items, item) });
  },
  
  removeFromCart: (idOrMenuItemId) => {
    set({ items: removeFromCartList(get().items, idOrMenuItemId) });
  },
  
  updateQuantity: (idOrMenuItemId, quantity) => {
    set({ items: updateCartItemQuantity(get().items, idOrMenuItemId, quantity) });
  },
  
  updateInstructions: (idOrMenuItemId, specialInstructions) => {
    set({ items: updateCartItemInstructions(get().items, idOrMenuItemId, specialInstructions) });
  },

  setItems: (items) => set({ items }),
  
  clearCart: () => set({ items: [] }),
}));
