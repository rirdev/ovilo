import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { initKinoMotion } from "./services/kinoMotion";

// Initialize Kino Motion Engine across all pages, controls, buttons & cards
initKinoMotion();

// Prevent default browser context menu to provide a pure native desktop feel
window.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return; // Allow native text operations inside inputs/textareas
  }
  e.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
