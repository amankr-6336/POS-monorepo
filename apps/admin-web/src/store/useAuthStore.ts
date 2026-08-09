import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: "owner" | "manager" | "waiter" | "chef";
    restaurantId: string;
    assignedStation?: string;
  } | null;
  setAuth: (accessToken: string, user: any) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem("adm_token") || null,
  user: JSON.parse(localStorage.getItem("adm_user") || "null"),
  
  setAuth: (accessToken, user) => {
    localStorage.setItem("adm_token", accessToken);
    localStorage.setItem("adm_user", JSON.stringify(user));
    set({ accessToken, user });
  },
  
  clearAuth: () => {
    localStorage.removeItem("adm_token");
    localStorage.removeItem("adm_user");
    set({ accessToken: null, user: null });
  },
}));
