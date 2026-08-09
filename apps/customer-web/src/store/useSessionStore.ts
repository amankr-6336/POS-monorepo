import { create } from "zustand";

interface SessionState {
  restaurant: { id: string; name: string; slug: string; logoUrl?: string } | null;
  table: { id: string; label: string; location: string; status: string } | null;
  customer: { id: string; name: string; mobileNumber: string } | null;
  customerToken: string | null;
  setSession: (restaurant: any, table: any) => void;
  setCustomer: (customer: any, token: string) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  restaurant: JSON.parse(localStorage.getItem("cust_restaurant") || "null"),
  table: JSON.parse(localStorage.getItem("cust_table") || "null"),
  customer: JSON.parse(localStorage.getItem("cust_customer") || "null"),
  customerToken: localStorage.getItem("cust_token") || null,
  
  setSession: (restaurant, table) => {
    localStorage.setItem("cust_restaurant", JSON.stringify(restaurant));
    localStorage.setItem("cust_table", JSON.stringify(table));
    set({ restaurant, table });
  },
  
  setCustomer: (customer, token) => {
    localStorage.setItem("cust_customer", JSON.stringify(customer));
    localStorage.setItem("cust_token", token);
    set({ customer, customerToken: token });
  },
  
  clearSession: () => {
    localStorage.removeItem("cust_restaurant");
    localStorage.removeItem("cust_table");
    localStorage.removeItem("cust_customer");
    localStorage.removeItem("cust_token");
    set({ restaurant: null, table: null, customer: null, customerToken: null });
  },
}));
