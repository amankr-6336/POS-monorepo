import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { useAuthStore } from "./store/useAuthStore";

// Global fetch interceptor to catch 401 Unauthorized (expired session)
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const response = await originalFetch(input, init);
  if (response.status === 401) {
    useAuthStore.getState().clearAuth();
    // Redirect to login if not already on the login page
    if (!window.location.pathname.endsWith("/login")) {
      window.location.href = "/login";
    }
  }
  return response;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
