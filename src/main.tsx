
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

// Get saved theme from localStorage
const savedTheme: "light" | "dark" =
  localStorage.getItem("admin-theme") === "light"
    ? "light"
    : "dark";

// Apply theme before React renders
document.documentElement.dataset.theme = savedTheme;

document.documentElement.classList.toggle(
  "dark",
  savedTheme === "dark"
);

// Get root element
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Root element not found. Check index.html."
  );
}

// Render applicationn
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
